import { useEffect, useState, useCallback } from "react";
import { toast } from "@/components/ui/use-toast";
import { supabase } from "./useBookings"; // Assuming same supabase instance

const STATS_REFRESH_INTERVAL = 180000; // 3 minutes

export const useBookingStats = () => {
  const [stats, setStats] = useState({
    total_bookings: 0,
    occupied_rooms: 0,
    revenue_today: 0,
    total_guests: 0,
  });
  const [isStatsLoading, setIsStatsLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    setIsStatsLoading(true);
    try {
      const { count: totalBookings, error: bookErr } = await supabase
        .from("bookings")
        .select("*", { count: "exact", head: true });
      if (bookErr) throw bookErr;

      const { count: occupiedRooms, error: occErr } = await supabase
        .from("rooms")
        .select("*", { count: "exact", head: true })
        .eq("status", "Occupied");
      if (occErr) throw occErr;

      const today = new Date().toISOString().split("T")[0];
      const { data: billingData, error: billErr } = await supabase
        .from("billing")
        .select("total_amount, created_at");
      if (billErr) throw billErr;

      const revenueToday =
        billingData
          ?.filter((b) => b.created_at.startsWith(today))
          ?.reduce((sum, b) => sum + Number(b.total_amount), 0) || 0;

      const { data: guestData, error: guestErr } = await supabase
        .from("bookings")
        .select("guests");
      if (guestErr) throw guestErr;

      const totalGuests =
        guestData?.reduce((sum, b) => sum + (b.guests || 0), 0) || 0;

      setStats({
        total_bookings: totalBookings || 0,
        occupied_rooms: occupiedRooms || 0,
        revenue_today: revenueToday,
        total_guests: totalGuests,
      });
    } catch (err) {
      console.error("Error loading stats:", err);
      toast({
        title: "Error",
        description: "Failed to fetch stats.",
        variant: "destructive",
      });
    } finally {
      setIsStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, STATS_REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchStats]);

  return { stats, fetchStats, isStatsLoading };
};