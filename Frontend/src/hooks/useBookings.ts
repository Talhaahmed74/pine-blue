import { useEffect, useState, useRef, useCallback } from "react";
import axios from "axios";
import { toast } from "@/components/ui/use-toast";
import { useBookingState } from "@/components/AppStateContext";
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL!;
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey);

const LIMIT = 8;
const DEBOUNCE_DELAY = 400;
const BACKGROUND_REFRESH_INTERVAL = 300000; // 5 minutes

export const useBookings = () => {
  const { bookingState, dispatchBooking } = useBookingState();
  const {
    recentBookings,
    isLoading,
    searchTerm,
    page,
    hasMoreBookings,
    searchPage,
    hasMoreSearchResults,
    isSearchMode,
    isLoadingMoreSearch,
  } = bookingState;

  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'


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
    try {
      if (!append) dispatchBooking({ type: 'SET_LOADING', payload: true });
      else setIsLoadingMore(true);

      const bookingsRes = await axios.get(`${API_BASE_URL}/dashboard/bookings`, {
        params: {
          limit: LIMIT,
          offset: pageNum * LIMIT,
        },
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

      dispatchBooking({ type: 'SET_HAS_MORE_BOOKINGS', payload: normalizedBookings.length === LIMIT });
    } catch (err) {
      console.error("Failed to load bookings:", err);
      toast({
        title: "Error",
        description: "Failed to fetch bookings.",
        variant: "destructive",
      });
    } finally {
      dispatchBooking({ type: 'SET_LOADING', payload: false });
      setIsLoadingMore(false);
    }
  }, [dispatchBooking]);

  // Search bookings
  const searchBookings = useCallback(async (query: string, pageNum = 0, append = false) => {
    if (!append) setIsSearching(true);
    else dispatchBooking({ type: 'SET_LOADING_MORE_SEARCH', payload: true });

    dispatchBooking({ type: 'SET_SEARCH_MODE', payload: true });

    try {
      const res = await axios.get(`${API_BASE_URL}/dashboard/bookings/search`, {
        params: {
          query: query.toUpperCase(),
          limit: LIMIT,
          offset: pageNum * LIMIT,
        },
      });

      const bookingsData = res.data.bookings || [];
      const normalizedBookings = bookingsData.map(normalizeBooking);

      if (append) {
        dispatchBooking({ 
          type: 'LOAD_MORE_BOOKINGS', 
          payload: { bookings: normalizedBookings, page: pageNum }
        });
      } else {
        dispatchBooking({ type: 'SET_RECENT_BOOKINGS', payload: normalizedBookings });
        dispatchBooking({ type: 'SET_SEARCH_PAGE', payload: 0 });
      }

      dispatchBooking({ type: 'SET_HAS_MORE_SEARCH_RESULTS', payload: normalizedBookings.length === LIMIT });
    } catch (err) {
      console.error('Search failed:', err);
      if (!append) dispatchBooking({ type: 'SET_RECENT_BOOKINGS', payload: [] });
      toast({
        title: "Error",
        description: "Failed to search bookings.",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
      dispatchBooking({ type: 'SET_LOADING_MORE_SEARCH', payload: false });
    }
  }, [dispatchBooking]);

  // Debounced search
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    if (searchTerm.trim()) {
      if (/^BK\d*$/i.test(searchTerm.trim())) {
        debounceTimer.current = setTimeout(() => {
          searchBookings(searchTerm.trim());
        }, DEBOUNCE_DELAY);
      }
    } else if (isSearchMode) {
      fetchBookings(0, false);
      dispatchBooking({ type: 'SET_SEARCH_MODE', payload: false });
    }

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [searchTerm, isSearchMode, fetchBookings, searchBookings]);

  // Handle load more
  const handleLoadMore = () => {
    if (isSearchMode) {
      if (!hasMoreSearchResults || isLoadingMoreSearch) return;
      const nextSearchPage = searchPage + 1;
      dispatchBooking({ type: 'SET_SEARCH_PAGE', payload: nextSearchPage });
      searchBookings(searchTerm.trim(), nextSearchPage, true);
    } else {
      if (!hasMoreBookings || isLoadingMore) return;
      const nextPage = page + 1;
      dispatchBooking({ type: 'SET_PAGE', payload: nextPage });
      fetchBookings(nextPage, true);
    }
  };

  // Optimistic delete
  const deleteBooking = async (bookingId: string) => {
    const previousBookings = [...recentBookings];
    dispatchBooking({ type: 'DELETE_BOOKING', payload: bookingId });

    try {
      await axios.put(`${API_BASE_URL}/bookings/${bookingId}/cancel`);
      toast({
        title: "Success",
        description: "Booking deleted successfully.",
      });
    } catch (err) {
      console.error("Delete failed:", err);
      dispatchBooking({ type: 'SET_RECENT_BOOKINGS', payload: previousBookings });
      toast({
        title: "Error",
        description: "Failed to delete booking. Rolled back.",
        variant: "destructive",
      });
    }
  };

  // Optimistic update
  const updateBooking = (updatedBooking: any) => {
    const previousBookings = [...recentBookings];
    dispatchBooking({ type: 'UPDATE_BOOKING', payload: updatedBooking });

    // Background revalidation
    setTimeout(() => {
      fetchBookings(0, false);
    }, 1000);
  };

// Background refresh
useEffect(() => {
    const interval = setInterval(() => {
      if (!isSearchMode) {
        fetchBookings(0, false)
      }
    }, BACKGROUND_REFRESH_INTERVAL)
  
    return () => clearInterval(interval)
  }, [fetchBookings, isSearchMode])
  
  // Initial fetch on mount
  useEffect(() => {
    if (!isSearchMode && recentBookings.length === 0) {
      fetchBookings(0, false)
    }
  }, [fetchBookings, isSearchMode, recentBookings.length])
  
  return {
    bookings: recentBookings,
    fetchBookings,
    searchBookings,
    deleteBooking,
    updateBooking,
    handleLoadMore,
    isLoading,
    isSearching,
    hasMoreBookings,
    hasMoreSearchResults,
    isSearchMode,
    searchTerm,
    setSearchTerm: (term: string) => dispatchBooking({ type: 'SET_SEARCH_TERM', payload: term }),
    isLoadingMoreSearch,
  }
  
};