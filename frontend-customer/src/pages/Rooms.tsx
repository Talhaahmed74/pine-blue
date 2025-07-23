"use client"

import { useState, useEffect } from "react"
import Header from "@/components/Header"
import RoomCard from "@/components/RoomCard"
import Footer from "@/components/Footer"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"

interface RoomType {
  id: number
  name: string
  base_price: number
  is_available: boolean
  amenities: string[]
  max_adults: number
  max_children: number
  created_at: string
  updated_at?: string
  total_capacity?: number
  available_rooms_count?: number
  total_rooms_count?: number
}

const Rooms = () => {
  const [rooms, setRooms] = useState<RoomType[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [sortBy, setSortBy] = useState("price-low")
  const [filterBy, setFilterBy] = useState("all")
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
      return "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800"
    }
  }

  // Fetch rooms with actual availability from your FastAPI backend
  useEffect(() => {
    const fetchRooms = async () => {
      try {
        setIsLoading(true)

        // Use the new endpoint that checks actual room availability
        const response = await fetch(`${API_BASE_URL}/room-types-with-availability`)

        if (!response.ok) {
          throw new Error("Failed to fetch rooms")
        }

        const data: RoomType[] = await response.json()

        // Add total_capacity if not present
        const roomsWithCapacity = data.map((room) => ({
          ...room,
          total_capacity: room.total_capacity || room.max_adults + room.max_children,
        }))

        setRooms(roomsWithCapacity)
        console.log("✅ Loaded rooms with availability:", roomsWithCapacity)
      } catch (error) {
        console.error("Error fetching rooms:", error)
        toast.error("Failed to load rooms. Using fallback data.")

        // Fallback data for demonstration
        setRooms([
          {
            id: 1,
            name: "Standard ROOM",
            base_price: 25000,
            is_available: true,
            amenities: ["Mountain View", "King Bed", "Mini Bar", "Balcony", "WiFi"],
            max_adults: 2,
            max_children: 1,
            created_at: new Date().toISOString(),
            total_capacity: 3,
            available_rooms_count: 2,
            total_rooms_count: 3,
          },
          {
            id: 2,
            name: "Executive Suite Room",
            base_price: 35000,
            is_available: false,
            amenities: ["Living Room", "Kitchenette", "Work Desk", "Hill View"],
            max_adults: 2,
            max_children: 2,
            created_at: new Date().toISOString(),
            total_capacity: 4,
            available_rooms_count: 0,
            total_rooms_count: 2,
          },

        ])
      } finally {
        setIsLoading(false)
      }
    }

    fetchRooms()
  }, [])

  // Filter and sort rooms
  const filteredAndSortedRooms = rooms
    .filter((room) => {
      switch (filterBy) {
        case "available":
          return room.is_available
        case "unavailable":
          return !room.is_available
        case "luxury":
          return room.base_price > 40000
        case "budget":
          return room.base_price <= 30000
        case "family":
          return (room.total_capacity || room.max_adults + room.max_children) >= 4
        default:
          return true
      }
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "price-low":
          return a.base_price - b.base_price
        case "price-high":
          return b.base_price - a.base_price
        case "capacity-high":
          return (
            (b.total_capacity || b.max_adults + b.max_children) - (a.total_capacity || a.max_adults + a.max_children)
          )
        case "capacity-low":
          return (
            (a.total_capacity || a.max_adults + a.max_children) - (b.total_capacity || b.max_adults + b.max_children)
          )
        case "name":
          return a.name.localeCompare(b.name)
        default:
          return 0
      }
    })

  // Get statistics
  const availableRooms = rooms.filter((room) => room.is_available).length
  const totalRooms = rooms.length
  const averagePrice =
    rooms.length > 0 ? Math.round(rooms.reduce((sum, room) => sum + room.base_price, 0) / rooms.length) : 0

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="container mx-auto px-4 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Our Rooms</h1>
          <p className="text-xl text-gray-600 mb-6">Choose from our wide selection of comfortable accommodations</p>

          {/* Statistics */}
          <div className="flex flex-wrap gap-4 mb-6">
            <div className="bg-white rounded-lg px-4 py-2 shadow-sm">
              <span className="text-sm text-gray-600">Total Room Types:</span>
              <span className="ml-2 font-semibold text-gray-900">{totalRooms}</span>
            </div>
            <div className="bg-white rounded-lg px-4 py-2 shadow-sm">
              <span className="text-sm text-gray-600">Available Types:</span>
              <span className="ml-2 font-semibold text-green-600">{availableRooms}</span>
            </div>
            <div className="bg-white rounded-lg px-4 py-2 shadow-sm">
              <span className="text-sm text-gray-600">Unavailable Types:</span>
              <span className="ml-2 font-semibold text-red-600">{totalRooms - availableRooms}</span>
            </div>
            <div className="bg-white rounded-lg px-4 py-2 shadow-sm">
              <span className="text-sm text-gray-600">Avg Price:</span>
              <span className="ml-2 font-semibold text-blue-600">₨{averagePrice.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Filters and Sorting */}
        <div className="flex flex-col md:flex-row gap-4 mb-8 bg-white p-4 rounded-lg shadow-sm">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">Sort by</label>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="price-low">Price: Low to High</SelectItem>
                <SelectItem value="price-high">Price: High to Low</SelectItem>
                <SelectItem value="capacity-high">Capacity: High to Low</SelectItem>
                <SelectItem value="capacity-low">Capacity: Low to High</SelectItem>
                <SelectItem value="name">Name: A to Z</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">Filter by</label>
            <Select value={filterBy} onValueChange={setFilterBy}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Filter by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Rooms</SelectItem>
                <SelectItem value="available">Available Only</SelectItem>
                <SelectItem value="unavailable">Unavailable Only</SelectItem>
                <SelectItem value="luxury">Luxury Rooms (₨40,000+)</SelectItem>
                <SelectItem value="budget">Budget Rooms (≤₨30,000)</SelectItem>
                <SelectItem value="family">Family Rooms (4+ guests)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-end">
            <Button
              variant="outline"
              onClick={() => {
                setSortBy("price-low")
                setFilterBy("all")
              }}
              className="w-full md:w-auto"
            >
              Clear Filters
            </Button>
          </div>
        </div>

        {/* Results Summary */}
        <div className="mb-6">
          <p className="text-gray-600">
            Showing <span className="font-semibold">{filteredAndSortedRooms.length}</span> of{" "}
            <span className="font-semibold">{totalRooms}</span> room types
            {filterBy !== "all" && (
              <span className="ml-2 text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">
                Filtered by: {filterBy.replace("-", " ")}
              </span>
            )}
          </p>
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="bg-gray-300 h-80 rounded-xl mb-4"></div>
                <div className="h-4 bg-gray-300 rounded mb-2"></div>
                <div className="h-4 bg-gray-300 rounded w-3/4"></div>
              </div>
            ))}
          </div>
        ) : filteredAndSortedRooms.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">🏨</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No rooms found</h3>
            <p className="text-gray-600 mb-4">Try adjusting your filters or search criteria</p>
            <Button
              onClick={() => {
                setSortBy("price-low")
                setFilterBy("all")
              }}
            >
              Clear All Filters
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredAndSortedRooms.map((room) => (
              <div key={room.id} className="relative">
                <RoomCard
                  id={room.id}
                  name={room.name}
                  price={room.base_price}
                  image={getImageForRoomType(room.name)}
                  capacity={room.total_capacity || room.max_adults + room.max_children}
                  children={room.max_children}
                  maxAdults={room.max_adults}
                  maxChildren={room.max_children}
                  isAvailable={room.is_available}
                  size="90 ft²"
                />
                {/* Room availability info */}
                {room.available_rooms_count !== undefined && room.total_rooms_count !== undefined && (
                  <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                    {room.available_rooms_count}/{room.total_rooms_count} available
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <Footer />
    </div>
  )
}

export default Rooms
