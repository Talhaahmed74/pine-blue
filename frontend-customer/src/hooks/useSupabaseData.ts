
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useRooms = () => {
  return useQuery({
    queryKey: ["rooms"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rooms")
        .select("*")
        .order("created_at", { ascending: true });
      
      if (error) throw error;
      return data;
    },
  });
};

export const useBookings = () => {
  return useQuery({
    queryKey: ["bookings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select(`
          *,
          rooms (
            name,
            price
          )
        `)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });
};

export const usePayments = () => {
  return useQuery({
    queryKey: ["payments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select(`
          *,
          bookings (
            guest_name,
            rooms (
              name
            )
          )
        `)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });
};

export const useStats = () => {
  return useQuery({
    queryKey: ["stats"],
    queryFn: async () => {
      // Get total rooms
      const { count: totalRooms } = await supabase
        .from("rooms")
        .select("*", { count: "exact", head: true });

      // Get occupied rooms
      const { count: occupiedRooms } = await supabase
        .from("rooms")
        .select("*", { count: "exact", head: true })
        .eq("status", "occupied");

      // Get pending bookings
      const { count: pendingBookings } = await supabase
        .from("bookings")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");

      // Get today's revenue
      const today = new Date().toISOString().split('T')[0];
      const { data: todayPayments } = await supabase
        .from("payments")
        .select("amount")
        .eq("status", "completed")
        .gte("payment_date", today);

      const todayRevenue = todayPayments?.reduce((sum, payment) => sum + Number(payment.amount), 0) || 0;

      return {
        totalRooms: totalRooms || 0,
        occupiedRooms: occupiedRooms || 0,
        pendingBookings: pendingBookings || 0,
        todayRevenue
      };
    },
  });
};
