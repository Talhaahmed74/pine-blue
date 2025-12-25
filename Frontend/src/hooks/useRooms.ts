import { useEffect, useState, useRef, useCallback } from "react";
import { toast } from "@/components/ui/use-toast";
import { useRoomState } from "@/components/AppStateContext";
import { supabase } from "@/lib/supabaseClient";
import { subscribeToRoomChanges } from "./realtimeManager";
import debounce from "lodash.debounce";


const LIMIT = 8;
const DEBOUNCE_DELAY = 400;
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.replace(/\/+$/, "");
const BACKGROUND_REFRESH_INTERVAL = 120000; // 2 min refresh interval

export const useRooms = () => {
  const { roomState, dispatchRoom } = useRoomState();
  const {
    rooms,
    loading,
    searchTerm,
    searchResults,
    isSearchMode,
    currentPage,
    hasMoreRooms,
    totalCount,
    roomStats,
    statsLoading,
    statusUpdating,
  } = roomState;

  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [activeStatusFilter, setActiveStatusFilter] = useState<string | null>(null);
  const [lastSearchQuery, setLastSearchQuery] = useState<string>("");
  const [searchCache, setSearchCache] = useState<Map<string, any[]>>(new Map());
  const isRefreshing = useRef(false);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  // Fetch rooms with pagination
  const fetchPaginatedRooms = async (page: number) => {
    const offset = (page - 1) * LIMIT;
    const res = await fetch(`${API_BASE_URL}/rooms?limit=${LIMIT}&offset=${offset}`);
    if (!res.ok) throw new Error("Failed to fetch rooms");
    return await res.json();
  };

  // Fetch room statistics
  const fetchRoomStats = useCallback(async () => {
    try {
      dispatchRoom({ type: "SET_STATS_LOADING", payload: true });
      const res = await fetch(`${API_BASE_URL}/rooms/stats`);
      if (!res.ok) throw new Error("Failed to fetch room stats");
      const stats = await res.json();

      dispatchRoom({
        type: "SET_ROOM_STATS",
        payload: {
          total: stats.total || 0,
          available: stats.available || 0,
          occupied: stats.occupied || 0,
          maintenance: stats.maintenance || 0,
        },
      });
    } catch (error) {
      console.error("Fetch room stats error:", error);
      toast({
        title: "Error",
        description: "Failed to fetch room statistics",
        variant: "destructive",
      });
    } finally {
      dispatchRoom({ type: "SET_STATS_LOADING", payload: false });
    }
  }, [dispatchRoom]);

  // Fetch all rooms for status filtering
  const fetchAllRoomsForFilter = async (status: string) => {
    try {
      dispatchRoom({ type: "SET_LOADING", payload: true });
      const res = await fetch(`${API_BASE_URL}/rooms?status=${status}&limit=1000`);
      if (!res.ok) throw new Error("Failed to fetch filtered rooms");
      const data = await res.json();

      const filteredRooms = data?.rooms || [];
      dispatchRoom({ type: "SET_ROOMS", payload: filteredRooms });
      setActiveStatusFilter(status);

      toast({
        title: "Filter Applied",
        description: `Showing ${filteredRooms.length} ${status.toLowerCase()} room(s)`,
      });
    } catch (error) {
      console.error("Filter fetch error:", error);
      toast({
        title: "Error",
        description: "Failed to filter rooms. Please try again.",
        variant: "destructive",
      });
    } finally {
      dispatchRoom({ type: "SET_LOADING", payload: false });
    }
  };

  // Fetch rooms
  const fetchRooms = useCallback(async () => {
    try {
      dispatchRoom({ type: "SET_LOADING", payload: true });
      const response = await fetchPaginatedRooms(1);

      const roomsData = response?.rooms || [];
      const totalCountData = response?.total_count || 0;

      dispatchRoom({ type: "SET_ROOMS", payload: roomsData });
      dispatchRoom({ type: "SET_CURRENT_PAGE", payload: 1 });
      dispatchRoom({ type: "SET_TOTAL_COUNT", payload: totalCountData });
      dispatchRoom({ type: "SET_HAS_MORE_ROOMS", payload: roomsData.length < totalCountData });
      dispatchRoom({ type: "SET_SEARCH_TERM", payload: "" });
      dispatchRoom({ type: "SET_SEARCH_RESULTS", payload: [] });
      dispatchRoom({ type: "SET_SEARCH_MODE", payload: false });
      setActiveStatusFilter(null);
    } catch (error) {
      console.error("Fetch rooms error:", error);
      dispatchRoom({ type: "SET_ROOMS", payload: [] });
      dispatchRoom({ type: "SET_TOTAL_COUNT", payload: 0 });
      dispatchRoom({ type: "SET_HAS_MORE_ROOMS", payload: false });
      toast({
        title: "Error",
        description: "Failed to fetch rooms from server",
        variant: "destructive",
      });
    } finally {
      dispatchRoom({ type: "SET_LOADING", payload: false });
    }
  }, [dispatchRoom]);

  // Search rooms
  const searchRooms = useCallback(
    async (query: string) => {
      const trimmedQuery = query.trim();
      if (trimmedQuery.length < 2) {
        dispatchRoom({ type: "SET_SEARCH_MODE", payload: false });
        dispatchRoom({ type: "SET_SEARCH_RESULTS", payload: [] });
        setLastSearchQuery("");
        return;
      }

      if (trimmedQuery === lastSearchQuery && searchCache.has(trimmedQuery)) {
        dispatchRoom({ type: "SET_SEARCH_RESULTS", payload: searchCache.get(trimmedQuery)! });
        dispatchRoom({ type: "SET_SEARCH_MODE", payload: true });
        return;
      }

      try {
        dispatchRoom({ type: "SET_LOADING", payload: true });
        const res = await fetch(`${API_BASE_URL}/rooms/search?query=${encodeURIComponent(trimmedQuery)}`);
        if (!res.ok) throw new Error("Search request failed");
        const rooms = await res.json();

        setSearchCache((prev) => new Map(prev).set(trimmedQuery, rooms));
        setLastSearchQuery(trimmedQuery);
        dispatchRoom({ type: "SET_SEARCH_RESULTS", payload: rooms });
        dispatchRoom({ type: "SET_SEARCH_MODE", payload: true });
      } catch (error) {
        console.error("Search failed:", error);
        dispatchRoom({ type: "SET_SEARCH_RESULTS", payload: [] });
        dispatchRoom({ type: "SET_SEARCH_MODE", payload: true });
        toast({
          title: "Error",
          description: "Failed to search rooms. Please try again.",
          variant: "destructive",
        });
      } finally {
        dispatchRoom({ type: "SET_LOADING", payload: false });
      }
    },
    [dispatchRoom, lastSearchQuery, searchCache]
  );

  // Debounced search
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      searchRooms(searchTerm);
    }, DEBOUNCE_DELAY);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [searchTerm, searchRooms]);

  // Load more rooms
  const handleLoadMore = async () => {
    if (isLoadingMore || !hasMoreRooms || isSearchMode || activeStatusFilter) return;

    setIsLoadingMore(true);
    try {
      const nextPage = currentPage + 1;
      const data = await fetchPaginatedRooms(nextPage);

      const newRooms = data?.rooms || [];
      const newTotalCount = data?.total_count || 0;

      dispatchRoom({
        type: "LOAD_MORE_ROOMS",
        payload: { rooms: newRooms, page: nextPage, hasMore: rooms.length + newRooms.length < newTotalCount },
      });

      toast({
        title: "Success",
        description: `Loaded ${newRooms.length} more rooms`,
      });
    } catch (error) {
      console.error("Load more failed:", error);
      toast({
        title: "Error",
        description: "Failed to load more rooms. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingMore(false);
    }
  };

  // Centralized refresh
  const handleRefresh = useCallback(async () => {
    if (isRefreshing.current) return;
    isRefreshing.current = true;

    try {
      await Promise.all([fetchRooms(), fetchRoomStats()]);
      toast({
        title: "Success",
        description: "Room data refreshed",
      });
    } catch (error) {
      console.error("Refresh failed:", error);
      toast({
        title: "Error",
        description: "Failed to refresh room data",
        variant: "destructive",
      });
    } finally {
      isRefreshing.current = false;
    }
  }, [fetchRooms, fetchRoomStats]);

  // Delete room with optimistic update
  const deleteRoom = async (roomNumber: string) => {
    const previousRooms = [...rooms];
    dispatchRoom({
      type: "SET_ROOMS",
      payload: rooms.filter((r) => r.room_number !== roomNumber),
    });

    try {
      const response = await fetch(`${API_BASE_URL}/rooms/${roomNumber}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || "Failed to delete room");
      }

      await Promise.all([fetchRooms(), fetchRoomStats()]);
      toast({
        title: "Success",
        description: "Room deleted successfully",
      });
    } catch (error) {
      console.error("Delete error:", error);
      dispatchRoom({ type: "SET_ROOMS", payload: previousRooms });
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete room",
        variant: "destructive",
      });
    }
  };

  // Update room status with optimistic update
  const updateRoomStatus = async (roomNumber: string, status: string) => {
    dispatchRoom({ type: "SET_STATUS_UPDATING", payload: { room_number: roomNumber, isUpdating: true } });
    dispatchRoom({ type: "UPDATE_ROOM_STATUS", payload: { room_number: roomNumber, status } });

    try {
      const response = await fetch(`${API_BASE_URL}/rooms/${roomNumber}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) throw new Error("Failed to update room status");
      await fetchRoomStats(); // Update stats after status change
    } catch (error) {
      console.error("Status update error:", error);
      dispatchRoom({
        type: "UPDATE_ROOM_STATUS",
        payload: { room_number: roomNumber, status: rooms.find((r) => r.room_number === roomNumber)?.status || "Available" },
      });
      toast({
        title: "Error",
        description: "Failed to update room status",
        variant: "destructive",
      });
    } finally {
      dispatchRoom({ type: "SET_STATUS_UPDATING", payload: { room_number: roomNumber, isUpdating: false } });
    }
  };

  // Handle status filter
  const handleStatusFilter = async (status: string) => {
    if (activeStatusFilter === status) {
      setActiveStatusFilter(null);
      await fetchRooms();
      return;
    }

    dispatchRoom({ type: "SET_SEARCH_MODE", payload: false });
    dispatchRoom({ type: "SET_SEARCH_RESULTS", payload: [] });
    dispatchRoom({ type: "SET_SEARCH_TERM", payload: "" });
    await fetchAllRoomsForFilter(status);
  };

  // Supabase real-time subscription
  useEffect(() => {
    const mounted = { current: true };
    let unsubscribe: (() => void) | null = null;
  
    const handleRoomUpdate = async (payload: any) => {
      if (!mounted.current || payload.eventType === "DELETE") return;
  
      if (payload.new?.room_number) {
        dispatchRoom({
          type: "UPDATE_ROOM_STATUS",
          payload: { room_number: payload.new.room_number, status: payload.new.status },
        });
  
        // 🔹 Don't spam fetchRoomStats every time. Batch or throttle instead:
        debouncedStatsUpdate();
      }
    };
  
    // Debounce the stats fetching
    const debouncedStatsUpdate = debounce(async () => {
      await fetchRoomStats();
    }, 2000);
  
    unsubscribe = subscribeToRoomChanges(handleRoomUpdate);
  
    return () => {
      mounted.current = false;
      if (unsubscribe) unsubscribe();
      debouncedStatsUpdate.cancel();
    };
  }, []); // ⬅️ no dependencies! subscribe only once
  

  // Initial data load
  useEffect(() => {
    const savedState = sessionStorage.getItem("admin_app_state");
    if (!savedState || savedState === "{}") {
      handleRefresh();
    } else {
      fetchRoomStats();
    }
    // only run once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  

// 🔹 Background auto-refresh (optimized for visibility)
useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === "visible" && !isSearchMode && !activeStatusFilter) {
        handleRefresh()
      }
    }, BACKGROUND_REFRESH_INTERVAL)
  
    return () => clearInterval(interval)
  }, [handleRefresh, isSearchMode, activeStatusFilter])
  
  

  return {
    rooms: {
      rooms,
      searchResults,
      statusUpdating,
    },
    roomStats,
    isLoading: loading,
    isStatsLoading: statsLoading,
    searchTerm,
    setSearchTerm: (term: string) => dispatchRoom({ type: "SET_SEARCH_TERM", payload: term }),
    isSearchMode,
    activeStatusFilter,
    hasMoreRooms,
    isLoadingMore,
    handleLoadMore,
    handleRefresh,
    handleStatusFilter,
    deleteRoom,
    updateRoomStatus,
  };
};