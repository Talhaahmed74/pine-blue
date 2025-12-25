import { useEffect, useRef, useCallback } from "react";
import { toast } from "@/components/ui/use-toast";
import { useRoomState } from "@/components/AppStateContext";
import { subscribeToRoomChanges } from "./realtimeManager";

const LIMIT = 8;
const DEBOUNCE_DELAY = 400;
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.replace(/\/+$/, "");
const BACKGROUND_REFRESH_INTERVAL = 120000; // 2 min

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
    activeStatusFilter,
    isLoadingMore,
  } = roomState;

  // Refs to prevent race conditions
  const abortControllerRef = useRef<AbortController | null>(null);
  const searchAbortControllerRef = useRef<AbortController | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hasInitialLoadedRef = useRef(false);
  const statsUpdateTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isFetchingRef = useRef(false);
  const lastSearchTermRef = useRef("");

  // Abort any in-flight requests
  const abortPendingRequests = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  const abortSearchRequests = () => {
    if (searchAbortControllerRef.current) {
      searchAbortControllerRef.current.abort();
    }
  };

  // Fetch room statistics (no loading state, silent update)
  const fetchRoomStats = useCallback(async (showLoading = false) => {
    try {
      if (showLoading) {
        dispatchRoom({ type: "SET_STATS_LOADING", payload: true });
      }

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
      if (showLoading) {
        toast({
          title: "Error",
          description: "Failed to fetch room statistics",
          variant: "destructive",
        });
      }
    } finally {
      if (showLoading) {
        dispatchRoom({ type: "SET_STATS_LOADING", payload: false });
      }
    }
  }, [dispatchRoom]);

  // Debounced stats update (for realtime changes)
  const debouncedStatsUpdate = useCallback(() => {
    if (statsUpdateTimerRef.current) {
      clearTimeout(statsUpdateTimerRef.current);
    }
    statsUpdateTimerRef.current = setTimeout(() => {
      fetchRoomStats(false); // Silent update
    }, 2000);
  }, [fetchRoomStats]);

  // Fetch paginated rooms
  const fetchPaginatedRooms = async (page: number, signal?: AbortSignal) => {
    const offset = (page - 1) * LIMIT;
    const res = await fetch(`${API_BASE_URL}/rooms?limit=${LIMIT}&offset=${offset}`, { signal });
    if (!res.ok) throw new Error("Failed to fetch rooms");
    return await res.json();
  };

  // Main fetch rooms function
  const fetchRooms = useCallback(async (showLoading = true) => {
    // Prevent concurrent fetches
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    // Abort any pending requests
    abortPendingRequests();
    abortControllerRef.current = new AbortController();

    try {
      if (showLoading) {
        dispatchRoom({ type: "SET_LOADING", payload: true });
      }

      const response = await fetchPaginatedRooms(1, abortControllerRef.current.signal);

      const roomsData = response?.rooms || [];
      const totalCountData = response?.total_count || 0;

      dispatchRoom({ type: "SET_ROOMS", payload: roomsData });
      dispatchRoom({ type: "SET_CURRENT_PAGE", payload: 1 });
      dispatchRoom({ type: "SET_TOTAL_COUNT", payload: totalCountData });
      dispatchRoom({ type: "SET_HAS_MORE_ROOMS", payload: roomsData.length < totalCountData });
    } catch (error: any) {
      if (error.name === 'AbortError') return; // Ignore aborted requests
      
      console.error("Fetch rooms error:", error);
      dispatchRoom({ type: "SET_ROOMS", payload: [] });
      dispatchRoom({ type: "SET_TOTAL_COUNT", payload: 0 });
      dispatchRoom({ type: "SET_HAS_MORE_ROOMS", payload: false });
      
      if (showLoading) {
        toast({
          title: "Error",
          description: "Failed to fetch rooms from server",
          variant: "destructive",
        });
      }
    } finally {
      if (showLoading) {
        dispatchRoom({ type: "SET_LOADING", payload: false });
      }
      isFetchingRef.current = false;
    }
  }, [dispatchRoom]);

  // Search rooms with abort controller
  const searchRooms = useCallback(async (query: string) => {
    const trimmedQuery = query.trim();
    
    // Don't search if less than 2 characters
    if (trimmedQuery.length < 2) {
      return;
    }

    // Don't search if it's the same as last search
    if (trimmedQuery === lastSearchTermRef.current && isSearchMode) {
      return;
    }

    lastSearchTermRef.current = trimmedQuery;

    // Abort previous search
    abortSearchRequests();
    searchAbortControllerRef.current = new AbortController();

    try {
      dispatchRoom({ type: "SET_LOADING", payload: true });
      
      const res = await fetch(
        `${API_BASE_URL}/rooms/search?query=${encodeURIComponent(trimmedQuery)}`,
        { signal: searchAbortControllerRef.current.signal }
      );
      
      if (!res.ok) throw new Error("Search request failed");
      const foundRooms = await res.json();

      dispatchRoom({ type: "SET_SEARCH_RESULTS", payload: foundRooms });
      dispatchRoom({ type: "SET_SEARCH_MODE", payload: true });
    } catch (error: any) {
      if (error.name === 'AbortError') return; // Ignore aborted requests
      
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
  }, [dispatchRoom, isSearchMode]);

  // Debounced search effect - CRITICAL FIX
  useEffect(() => {
    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    const trimmedTerm = searchTerm.trim();

    // Case 1: Empty search term
    if (trimmedTerm.length === 0) {
      if (isSearchMode) {
        // Clear search mode immediately
        dispatchRoom({ type: "CLEAR_SEARCH" });
        lastSearchTermRef.current = "";
        abortSearchRequests();
      }
      return;
    }

    // Case 2: Search term too short
    if (trimmedTerm.length < 2) {
      return;
    }

    // Case 3: Valid search term - debounce it
    debounceTimerRef.current = setTimeout(() => {
      searchRooms(trimmedTerm);
    }, DEBOUNCE_DELAY);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchTerm]); // ONLY depend on searchTerm, nothing else!

  // Load more rooms
  const handleLoadMore = async () => {
    if (isLoadingMore || !hasMoreRooms || isSearchMode || activeStatusFilter) return;

    dispatchRoom({ type: "SET_LOADING_MORE", payload: true });

    try {
      const nextPage = currentPage + 1;
      const data = await fetchPaginatedRooms(nextPage);

      const newRooms = data?.rooms || [];
      const newTotalCount = data?.total_count || 0;

      dispatchRoom({
        type: "LOAD_MORE_ROOMS",
        payload: { 
          rooms: newRooms, 
          page: nextPage, 
          hasMore: rooms.length + newRooms.length < newTotalCount 
        },
      });
    } catch (error) {
      console.error("Load more failed:", error);
      toast({
        title: "Error",
        description: "Failed to load more rooms. Please try again.",
        variant: "destructive",
      });
    } finally {
      dispatchRoom({ type: "SET_LOADING_MORE", payload: false });
    }
  };

  // Refresh data (clears everything)
  const handleRefresh = useCallback(async () => {
    dispatchRoom({ type: "CLEAR_SEARCH" });
    dispatchRoom({ type: "CLEAR_FILTER" });
    lastSearchTermRef.current = "";
    
    await Promise.all([
      fetchRooms(true),
      fetchRoomStats(true)
    ]);

    toast({
      title: "Success",
      description: "Room data refreshed",
    });
  }, [fetchRooms, fetchRoomStats, dispatchRoom]);

  // Delete room with optimistic update
  const deleteRoom = async (roomNumber: string) => {
    const previousRooms = [...rooms];
    const previousSearchResults = [...searchResults];
    
    // Optimistically remove from both lists
    dispatchRoom({
      type: "SET_ROOMS",
      payload: rooms.filter((r) => r.room_number !== roomNumber),
    });
    dispatchRoom({
      type: "SET_SEARCH_RESULTS",
      payload: searchResults.filter((r) => r.room_number !== roomNumber),
    });

    try {
      const response = await fetch(`${API_BASE_URL}/rooms/${roomNumber}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || "Failed to delete room");
      }

      // Only refresh stats, not all data
      await fetchRoomStats(false);
      
      toast({
        title: "Success",
        description: "Room deleted successfully",
      });
    } catch (error) {
      console.error("Delete error:", error);
      
      // Rollback on error
      dispatchRoom({ type: "SET_ROOMS", payload: previousRooms });
      dispatchRoom({ type: "SET_SEARCH_RESULTS", payload: previousSearchResults });
      
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete room",
        variant: "destructive",
      });
    }
  };

  // Update room status with optimistic update (NO FULL REFETCH)
  const updateRoomStatus = async (roomNumber: string, status: string) => {
    // Find current status
    const currentRoom = rooms.find((r) => r.room_number === roomNumber);
    const oldStatus = currentRoom?.status || "Available";

    dispatchRoom({ 
      type: "SET_STATUS_UPDATING", 
      payload: { room_number: roomNumber, isUpdating: true } 
    });
    
    // Optimistic update
    dispatchRoom({ 
      type: "UPDATE_ROOM_STATUS", 
      payload: { room_number: roomNumber, status } 
    });

    try {
      const response = await fetch(`${API_BASE_URL}/rooms/${roomNumber}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) throw new Error("Failed to update room status");
      
      // Success - stats already updated optimistically in reducer
    } catch (error) {
      console.error("Status update error:", error);
      
      // Rollback on error
      dispatchRoom({
        type: "UPDATE_ROOM_STATUS",
        payload: { room_number: roomNumber, status: oldStatus },
      });
      
      toast({
        title: "Error",
        description: "Failed to update room status",
        variant: "destructive",
      });
    } finally {
      dispatchRoom({ 
        type: "SET_STATUS_UPDATING", 
        payload: { room_number: roomNumber, isUpdating: false } 
      });
    }
  };

  // Fetch all rooms for status filter
  const fetchAllRoomsForFilter = async (status: string) => {
    abortPendingRequests();
    abortControllerRef.current = new AbortController();

    try {
      dispatchRoom({ type: "SET_LOADING", payload: true });
      
      const res = await fetch(
        `${API_BASE_URL}/rooms?status=${status}&limit=1000`,
        { signal: abortControllerRef.current.signal }
      );
      
      if (!res.ok) throw new Error("Failed to fetch filtered rooms");
      const data = await res.json();

      const filteredRooms = data?.rooms || [];
      dispatchRoom({ type: "SET_ROOMS", payload: filteredRooms });
      dispatchRoom({ type: "SET_ACTIVE_STATUS_FILTER", payload: status });

      toast({
        title: "Filter Applied",
        description: `Showing ${filteredRooms.length} ${status.toLowerCase()} room(s)`,
      });
    } catch (error: any) {
      if (error.name === 'AbortError') return;
      
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

  // Handle status filter toggle
  const handleStatusFilter = async (status: string) => {
    if (activeStatusFilter === status) {
      // Clear filter - go back to normal view
      dispatchRoom({ type: "CLEAR_FILTER" });
      await fetchRooms(true);
      return;
    }

    // Clear search when applying filter
    dispatchRoom({ type: "CLEAR_SEARCH" });
    lastSearchTermRef.current = "";
    await fetchAllRoomsForFilter(status);
  };

  // Realtime subscription
  useEffect(() => {
    const handleRoomUpdate = (payload: any) => {
      if (payload.eventType === "DELETE") return;

      if (payload.new?.room_number) {
        dispatchRoom({
          type: "UPDATE_ROOM_STATUS",
          payload: { 
            room_number: payload.new.room_number, 
            status: payload.new.status 
          },
        });

        // Debounced stats update to avoid spam
        debouncedStatsUpdate();
      }
    };

    const unsubscribe = subscribeToRoomChanges(handleRoomUpdate);

    return () => {
      if (unsubscribe) unsubscribe();
      if (statsUpdateTimerRef.current) {
        clearTimeout(statsUpdateTimerRef.current);
      }
    };
  }, [dispatchRoom, debouncedStatsUpdate]);

  // Initial data load (only once) - FIXED
  useEffect(() => {
    if (!hasInitialLoadedRef.current) {
      hasInitialLoadedRef.current = true;
      
      // Always load initial data
      Promise.all([
        fetchRooms(true),
        fetchRoomStats(true)
      ]);
    }
  }, []); // Empty deps - run ONLY once on mount

  // Background refresh (only when visible and no active filter/search)
  useEffect(() => {
    const interval = setInterval(() => {
      if (
        document.visibilityState === "visible" && 
        !isSearchMode && 
        !activeStatusFilter &&
        !isFetchingRef.current
      ) {
        fetchRooms(false); // Silent refresh
        fetchRoomStats(false); // Silent stats update
      }
    }, BACKGROUND_REFRESH_INTERVAL);

    return () => clearInterval(interval);
  }, [isSearchMode, activeStatusFilter, fetchRooms, fetchRoomStats]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortPendingRequests();
      abortSearchRequests();
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      if (statsUpdateTimerRef.current) clearTimeout(statsUpdateTimerRef.current);
    };
  }, []);

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