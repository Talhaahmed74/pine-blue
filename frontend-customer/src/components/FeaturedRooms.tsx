"use client"

import { useState, useEffect } from "react"
import RoomCard from "./RoomCard"
import { toast } from "sonner"

interface RoomType {
  id: number
  name: string
  base_price: number
  is_available: boolean
  amenities: string[]
  max_adults: number
  max_children: number
  total_capacity: number
}

const FeaturedRooms = () => {
  const [rooms, setRooms] = useState<RoomType[]>([])
  const [loading, setLoading] = useState(true)
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.replace(/\/+$/, "");
  // Image mapping for different room types
  const getImageForRoomType = (roomName: string) => {
    const normalizedName = roomName.toLowerCase()

    if (normalizedName.includes("premium")) {
      return "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800"
    } else if (normalizedName.includes("standard double")) {
      return "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800"
    } else if (normalizedName.includes("standard")) {
      return "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800"
    } else if (normalizedName.includes("deluxe")) {
      return "https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=800"
    } else if (normalizedName.includes("suite")) {
      return "https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800"
    } else if (normalizedName.includes("luxury") || normalizedName.includes("luxe")) {
      return "https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=800"
    } else {
      // Default image
      return "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800"
    }
  }

  useEffect(() => {
    const fetchRoomTypes = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/room-types`)
        if (!response.ok) {
          throw new Error("Failed to fetch room types")
        }
        const data = await response.json()
        setRooms(data)
      } catch (error) {
        console.error("Error fetching room types:", error)
        toast.error("Failed to load room types")
        // Fallback to hardcoded data if API fails
        setRooms([
          {
            id: 1,
            name: "PREMIUM ROOM",
            base_price: 25000,
            is_available: false,
            amenities: ["Mountain View", "AC", "TV", "Balcony", "WiFi"],
            max_adults: 2,
            max_children: 1,
            total_capacity: 3,
          },
          {
            id: 3,
            name: "Standard",
            base_price: 8000,
            is_available: false,
            amenities: ["Modern Design", "Work Space", "Smart TV", "Fireplace"],
            max_adults: 2,
            max_children: 0,
            total_capacity: 2,
          },
        ])
      } finally {
        setLoading(false)
      }
    }

    fetchRoomTypes()
  }, [])

  if (loading) {
    return (
      <section className="py-24 bg-white room-bg">
        <div className="container mx-auto px-4">
          <div className="text-left mb-16">
            <h2 className="text-center text-4xl md:text-5xl font-light text-gray-900 mb-6">OUR ROOMS</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="bg-gray-300 h-80 rounded-xl mb-4"></div>
                <div className="h-4 bg-gray-300 rounded mb-2"></div>
                <div className="h-4 bg-gray-300 rounded w-3/4"></div>
              </div>
            ))}
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="py-24 bg-white room-bg">
      <div className="container mx-auto px-4">
        <div className="text-left mb-16">
          <h2 className="text-center text-4xl md:text-5xl font-light text-gray-900 mb-6">OUR ROOMS</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          {rooms.map((room) => (
            <RoomCard
              key={room.id}
              id={room.id}
              name={room.name}
              price={room.base_price}
              image={getImageForRoomType(room.name)}
              capacity={room.total_capacity}
              children={room.max_children}
              maxAdults={room.max_adults}
              maxChildren={room.max_children}
              isAvailable={room.is_available}
              size="90 ft²"
            />
          ))}
        </div>
      </div>
    </section>
  )
}

export default FeaturedRooms
