import { supabase } from "@/lib/supabaseClient";
import { RealtimeChannel } from "@supabase/supabase-js";
import { debounce } from "lodash";

export const subscribeToRoomChanges = (callback: (payload: any) => void): () => void => {
  const debouncedCallback = debounce(callback, 800);

  const channel: RealtimeChannel = supabase
    .channel("rooms-changes")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "rooms" },
      (payload) => {
        console.log("Realtime room update:", payload);
        debouncedCallback(payload);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
    debouncedCallback.cancel();
  };
};