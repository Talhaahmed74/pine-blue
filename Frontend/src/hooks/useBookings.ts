import { useEffect, useRef, useCallback } from "react";
import axios from "axios";
import { toast } from "@/components/ui/use-toast";
import { useBookingState } from "@/components/AppStateContext";

const LIMIT = 8;
const DEBOUNCE_DELAY = 400;
const BACKGROUND_REFRESH_INTERVAL = 300000; // 5 minutes
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export const useBookings = () => {
  const { bookingState, dispatchBooking } = useBookingState();
  const {
    recentBookings,
    searchResults,
    isLoading,
    searchTerm,
    page,
    hasMoreBookings,
    searchPage,
    hasMoreSearchResults,
    isSearchMode,
    isLoadingMoreSearch,
  } = bookingState;

  // Refs to prevent race conditions
  const abortControllerRef = useRef<AbortController | null>(null);
  const searchAbortControllerRef = useRef<AbortController | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hasInitialLoadedRef = useRef(false);
  const isFetchingRef = useRef(false);
  const lastSearchTermRef = useRef("");

  // Abort pending requests
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

  // Normalize booking data
  const normalizeBooking = (booking: any) => ({
    ...booking,
    id: booking.booking_id,
    guest: `${booking.first_name} ${booking.last_name}`,
    room: `${booking.room_type} ${booking.room_number}`,
    checkIn: booking.check_in,
    checkOut: booking.check_out,
    amount: booking.billing?.[0]?.total_amount || booking.billing?.total_amount || 0,
  });

  // Fetch bookings with pagination
  const fetchBookings = useCallback(async (pageNum = 0, append = false) => {
    // Prevent concurrent fetches
    if (!append && isFetchingRef.current) return;
    if (append) isFetchingRef.current = true;

    // Abort previous request
    abortPendingRequests();
    abortControllerRef.current = new AbortController();

    try {
      if (!append) {
        dispatchBooking({ type: 'SET_LOADING', payload: true });
      }

      const bookingsRes = await axios.get(`${API_BASE_URL}/dashboard/bookings`, {
        params: { limit: LIMIT, offset: pageNum * LIMIT },
        signal: abortControllerRef.current.signal,
      });

      const bookingsData = bookingsRes.data.bookings || [];
      const normalizedBookings = bookingsData.map(normalizeBooking);

      if (append) {
        dispatchBooking({ 
          type: 'LOAD_MORE_BOOKINGS', 
          payload: { bookings: normalizedBookings, page: pageNum }
        });
      } else {
        dispatchBooking({ type: 'SET_RECENT_BOOKINGS', payload: normalizedBookings });
        dispatchBooking({ type: 'SET_PAGE', payload: pageNum });
      }

      dispatchBooking({ 
        type: 'SET_HAS_MORE_BOOKINGS', 
        payload: normalizedBookings.length === LIMIT 
      });
    } catch (err: any) {
      if (err.name === 'CanceledError' || err.code === 'ERR_CANCELED') return;
      
      console.error("Failed to load bookings:", err);
      toast({
        title: "Error",
        description: "Failed to fetch bookings.",
        variant: "destructive",
      });
    } finally {
      dispatchBooking({ type: 'SET_LOADING', payload: false });
      isFetchingRef.current = false;
    }
  }, [dispatchBooking]);

  // Search bookings with abort controller
  const searchBookings = useCallback(async (query: string, pageNum = 0, append = false) => {
    const trimmedQuery = query.trim();
    
    if (!trimmedQuery) {
      return;
    }

    // Don't search if it's the same as last search
    if (!append && trimmedQuery === lastSearchTermRef.current && isSearchMode) {
      return;
    }

    if (!append) {
      lastSearchTermRef.current = trimmedQuery;
    }

    // Abort previous search
    abortSearchRequests();
    searchAbortControllerRef.current = new AbortController();

    try {
      if (!append) {
        dispatchBooking({ type: 'SET_LOADING', payload: true });
      } else {
        dispatchBooking({ type: 'SET_LOADING_MORE_SEARCH', payload: true });
      }

      dispatchBooking({ type: 'SET_SEARCH_MODE', payload: true });

      const res = await axios.get(`${API_BASE_URL}/dashboard/bookings/search`, {
        params: {
          query: trimmedQuery.toUpperCase(),
          limit: LIMIT,
          offset: pageNum * LIMIT,
        },
        signal: searchAbortControllerRef.current.signal,
      });

      const bookingsData = res.data.bookings || [];
      const normalizedBookings = bookingsData.map(normalizeBooking);

      if (append) {
        dispatchBooking({ 
          type: 'LOAD_MORE_SEARCH_RESULTS', 
          payload: { 
            results: normalizedBookings, 
            page: pageNum,
            hasMore: normalizedBookings.length === LIMIT 
          }
        });
      } else {
        dispatchBooking({ type: 'SET_SEARCH_RESULTS', payload: normalizedBookings });
        dispatchBooking({ type: 'SET_SEARCH_PAGE', payload: 0 });
        dispatchBooking({ 
          type: 'SET_HAS_MORE_SEARCH_RESULTS', 
          payload: normalizedBookings.length === LIMIT 
        });
      }
    } catch (err: any) {
      if (err.name === 'CanceledError' || err.code === 'ERR_CANCELED') return;
      
      console.error('Search failed:', err);
      if (!append) {
        dispatchBooking({ type: 'SET_SEARCH_RESULTS', payload: [] });
      }
      toast({
        title: "Error",
        description: "Failed to search bookings.",
        variant: "destructive",
      });
    } finally {
      dispatchBooking({ type: 'SET_LOADING', payload: false });
      dispatchBooking({ type: 'SET_LOADING_MORE_SEARCH', payload: false });
    }
  }, [dispatchBooking, isSearchMode]);

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
        dispatchBooking({ type: 'CLEAR_SEARCH' });
        lastSearchTermRef.current = "";
        abortSearchRequests();
      }
      return;
    }

    // Case 2: Not a valid booking ID pattern
    if (!/^BK\d*$/i.test(trimmedTerm)) {
      return; // Don't search for invalid patterns
    }

    // Case 3: Valid search term - debounce it
    debounceTimerRef.current = setTimeout(() => {
      searchBookings(trimmedTerm);
    }, DEBOUNCE_DELAY);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchTerm]); // ONLY depend on searchTerm, nothing else!

  // Handle load more
  const handleLoadMore = useCallback(() => {
    if (isSearchMode) {
      if (!hasMoreSearchResults || isLoadingMoreSearch) return;
      const nextSearchPage = searchPage + 1;
      searchBookings(searchTerm.trim(), nextSearchPage, true);
    } else {
      if (!hasMoreBookings || isFetchingRef.current) return;
      const nextPage = page + 1;
      fetchBookings(nextPage, true);
    }
  }, [
    isSearchMode, 
    hasMoreSearchResults, 
    isLoadingMoreSearch, 
    searchPage, 
    searchTerm, 
    searchBookings,
    hasMoreBookings, 
    page, 
    fetchBookings
  ]);

  // Optimistic delete
  const deleteBooking = async (bookingId: string) => {
    const previousBookings = [...recentBookings];
    const previousSearchResults = [...searchResults];
    
    // Optimistically remove from both lists
    dispatchBooking({ type: 'DELETE_BOOKING', payload: bookingId });

    try {
      await axios.put(`${API_BASE_URL}/bookings/${bookingId}/cancel`);
      toast({
        title: "Success",
        description: "Booking cancelled successfully.",
      });
    } catch (err) {
      console.error("Delete failed:", err);
      
      // Rollback on error
      dispatchBooking({ type: 'SET_RECENT_BOOKINGS', payload: previousBookings });
      if (isSearchMode) {
        dispatchBooking({ type: 'SET_SEARCH_RESULTS', payload: previousSearchResults });
      }
      
      toast({
        title: "Error",
        description: "Failed to cancel booking. Rolled back.",
        variant: "destructive",
      });
    }
  };

  // Optimistic update (no background refetch)
  const updateBooking = (updatedBooking: any) => {
    dispatchBooking({ type: 'UPDATE_BOOKING', payload: updatedBooking });
    
    toast({
      title: "Success",
      description: "Booking updated successfully.",
    });
  };

  // Initial fetch on mount - FIXED
  useEffect(() => {
    if (!hasInitialLoadedRef.current) {
      hasInitialLoadedRef.current = true;
      
      // Always load initial data
      fetchBookings(0, false);
    }
  }, []); // Empty deps - run ONLY once on mount

  // Background refresh (only when visible and not searching)
  useEffect(() => {
    const interval = setInterval(() => {
      if (
        document.visibilityState === "visible" && 
        !isSearchMode && 
        !isFetchingRef.current
      ) {
        fetchBookings(0, false); // Silent refresh
      }
    }, BACKGROUND_REFRESH_INTERVAL);

    return () => clearInterval(interval);
  }, [isSearchMode, fetchBookings]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortPendingRequests();
      abortSearchRequests();
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Return display bookings based on mode
  const displayBookings = isSearchMode ? searchResults : recentBookings;

  return {
    bookings: displayBookings,
    fetchBookings,
    searchBookings,
    deleteBooking,
    updateBooking,
    handleLoadMore,
    isLoading,
    isSearching: isLoading && isSearchMode,
    hasMoreBookings,
    hasMoreSearchResults,
    isSearchMode,
    searchTerm,
    setSearchTerm: (term: string) => dispatchBooking({ type: 'SET_SEARCH_TERM', payload: term }),
    isLoadingMoreSearch,
  };
};