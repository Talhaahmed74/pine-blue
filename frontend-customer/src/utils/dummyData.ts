
import { Database } from '@/integrations/supabase/types';

type RoomStatus = Database['public']['Enums']['room_status'];

export const dummyRooms: Array<{
  name: string;
  description: string;
  price: number;
  capacity: number;
  status: RoomStatus;
  image_url: string;
  amenities: string[];
}> = [
  {
    name: "Deluxe Ocean View Suite",
    description: "Spacious suite with panoramic ocean views, perfect for couples seeking luxury and comfort.",
    price: 25000,
    capacity: 2,
    status: "available" as RoomStatus,
    image_url: "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800",
    amenities: ["WiFi", "AC", "TV", "Balcony", "Mini Bar", "Sea View", "Room Service"]
  },
  {
    name: "Family Garden Villa",
    description: "Large villa with private garden, ideal for families with children.",
    price: 35000,
    capacity: 4,
    status: "available" as RoomStatus, 
    image_url: "https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=800",
    amenities: ["WiFi", "AC", "TV", "Garden View", "Kitchen", "Gym Access", "Pool Access"]
  },
  {
    name: "Executive Business Suite",
    description: "Modern suite designed for business travelers with work desk and meeting area.",
    price: 18000,
    capacity: 2,
    status: "occupied" as RoomStatus,
    image_url: "https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800", 
    amenities: ["WiFi", "AC", "TV", "Work Desk", "Coffee Machine", "City View"]
  },
  {
    name: "Premium Presidential Suite",
    description: "The ultimate luxury experience with separate living area and premium amenities.",
    price: 50000,
    capacity: 4,
    status: "available" as RoomStatus,
    image_url: "https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=800",
    amenities: ["WiFi", "AC", "TV", "Balcony", "Mini Bar", "Sea View", "Room Service", "Jacuzzi", "Butler Service"]
  },
  {
    name: "Cozy Standard Room",
    description: "Comfortable and affordable room perfect for solo travelers or short stays.",
    price: 8000,
    capacity: 1,
    status: "maintenance" as RoomStatus,
    image_url: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800",
    amenities: ["WiFi", "AC", "TV"]
  }
];

export const addDummyRooms = async () => {
  const { supabase } = await import('@/integrations/supabase/client');
  
  try {
    const { data, error } = await supabase.from('rooms').insert(dummyRooms);
    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    return { success: false, error };
  }
};
