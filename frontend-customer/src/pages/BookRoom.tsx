"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useAuth } from "@/contexts/AuthContext"
import { toast } from "sonner"
import Header from "@/components/Header"
import Footer from "@/components/Footer"
import { CalendarIcon, Users, Mail, Phone, User, ArrowLeft } from "lucide-react"
import { format } from "date-fns"

interface RoomType {
  id: number
  name: string
  base_price: number
  is_available: boolean
  amenities: string[]
  max_adults: number
  max_children: number
}

interface AllocatedRoom {
  room_number: string
  floor: number
}

const BookRoom = () => {
  const { roomId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [roomType, setRoomType] = useState<RoomType | null>(null)
  const [allocatedRoom, setAllocatedRoom] = useState<AllocatedRoom | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [checkIn, setCheckIn] = useState<Date>()
  const [checkOut, setCheckOut] = useState<Date>()
  const [guestName, setGuestName] = useState("")
  const [guestEmail, setGuestEmail] = useState("")
  const [guestPhone, setGuestPhone] = useState("")
  const [specialRequests, setSpecialRequests] = useState("")
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
  // Image mapping for room types
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

  // Redirect if not logged in
  useEffect(() => {
    if (!user) {
      toast.error("Please login to book a room")
      // Trigger login modal on home page
      navigate("/?login=true")
      return
    }
  }, [user, navigate])

  // Pre-fill user data
  useEffect(() => {
    if (user) {
      setGuestEmail(user.email || "")
      setGuestName(user.name || "")
    }
  }, [user])

  // Fetch room type details
  useEffect(() => {
    const fetchRoomType = async () => {
      if (!roomId) return
      try {
        const response = await fetch(`${API_BASE_URL}/room_types/${roomId}`)
        if (!response.ok) {
          toast.error("Room type not found")
          navigate("/rooms")
          return
        }
        const data = await response.json()
        if (!data.is_available) {
          toast.error("This room type is currently unavailable")
          navigate("/rooms")
          return
        }
        setRoomType(data)
      } catch (error) {
        console.error("Error fetching room type:", error)
        toast.error("Failed to load room details")
        navigate("/rooms")
      } finally {
        setLoading(false)
      }
    }
    fetchRoomType()
  }, [roomId, navigate])

  const calculateTotal = () => {
    if (!roomType || !checkIn || !checkOut) return 0
    const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24))
    return nights * roomType.base_price
  }

  const calculateNights = () => {
    if (!checkIn || !checkOut) return 0
    return Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!checkIn || !checkOut) {
      toast.error("Please select check-in and check-out dates")
      return
    }
    if (checkOut <= checkIn) {
      toast.error("Check-out date must be after check-in date")
      return
    }
    if (!user || !roomType) return

    setSubmitting(true)
    try {
      // Create booking with the correct data structure
      const bookingData = {
        room_type_id: roomType.id,
        user_id: user.id,
        guest_name: guestName,
        guest_email: guestEmail,
        guest_phone: guestPhone,
        check_in: format(checkIn, "yyyy-MM-dd"),
        check_out: format(checkOut, "yyyy-MM-dd"),
        total_amount: calculateTotal(),
        special_requests: specialRequests,
        status: "pending", // Changed from "confirmed" to "pending"
      }

      console.log("📤 Sending booking data:", bookingData)
      const response = await fetch(`${API_BASE_URL}/bookings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(bookingData),
      })

      console.log("📡 Booking response status:", response.status)
      if (!response.ok) {
        const errorText = await response.text()
        console.error("❌ Booking error response:", errorText)
        let errorMessage = "Booking failed"
        try {
          const error = JSON.parse(errorText)
          errorMessage = error.detail || error.message || errorMessage
        } catch (parseError) {
          errorMessage = `Server error (${response.status}): ${errorText}`
        }
        throw new Error(errorMessage)
      }

      const booking = await response.json()
      console.log("✅ Booking response:", booking)

      toast.success("Booking created! Please complete billing details.")

      // Redirect to PaymentSuccess with booking_id instead of showing confirmation
      navigate(`/payment-success?booking_id=${booking.booking_id}`)
    } catch (error: any) {
      console.error("Booking error:", error)
      toast.error(error.message || "Booking failed")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-16">
          <div className="text-center">Loading room details...</div>
        </div>
        <Footer />
      </div>
    )
  }

  if (!roomType) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-16">
          <div className="text-center">Room type not found</div>
        </div>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-0">
      <Header />
      <div className="container mx-auto px-4 py-8">
        {/* Back Button */}
        <Button variant="ghost" onClick={() => navigate("/rooms")} className="mb-6 gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back to Rooms
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Room Details */}
          <Card>
            <CardHeader>
              <CardTitle>Room Details</CardTitle>
            </CardHeader>
            <CardContent>
              <img
                src={getImageForRoomType(roomType.name) || "/placeholder.svg"}
                alt={roomType.name}
                className="w-full h-64 object-cover rounded-lg mb-4"
              />
              <h3 className="text-xl font-semibold mb-2">{roomType.name}</h3>
              <div className="flex items-center gap-4 mb-4">
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  <span>
                    Up to {roomType.max_adults} adults, {roomType.max_children} children
                  </span>
                </div>
                <div className="text-lg font-semibold text-primary">₨{roomType.base_price.toLocaleString()}/night</div>
              </div>
              <div className="flex flex-wrap gap-2">
                {roomType.amenities?.map((amenity: string) => (
                  <span key={amenity} className="bg-gray-100 px-2 py-1 rounded-full text-sm">
                    {amenity}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Booking Form */}
          <Card>
            <CardHeader>
              <CardTitle>Book This Room</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Check-in Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left bg-transparent">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {checkIn ? format(checkIn, "MMM dd, yyyy") : "Select date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={checkIn}
                          onSelect={setCheckIn}
                          disabled={(date) => date < new Date()}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div>
                    <Label>Check-out Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left bg-transparent">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {checkOut ? format(checkOut, "MMM dd, yyyy") : "Select date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={checkOut}
                          onSelect={setCheckOut}
                          disabled={(date) => date <= (checkIn || new Date())}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                <div>
                  <Label htmlFor="guestName">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="guestName"
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="guestEmail">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="guestEmail"
                      type="email"
                      value={guestEmail}
                      onChange={(e) => setGuestEmail(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="guestPhone">Phone Number</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="guestPhone"
                      value={guestPhone}
                      onChange={(e) => setGuestPhone(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="specialRequests">Special Requests</Label>
                  <Textarea
                    id="specialRequests"
                    value={specialRequests}
                    onChange={(e) => setSpecialRequests(e.target.value)}
                    placeholder="Any special requests or requirements..."
                  />
                </div>

                {checkIn && checkOut && calculateNights() > 0 && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span>Total for {calculateNights()} nights:</span>
                      <span className="text-xl font-bold text-primary">₨{calculateTotal().toLocaleString()}</span>
                    </div>
                  </div>
                )}

                <Button type="submit" className="w-full" disabled={submitting || calculateNights() <= 0}>
                  {submitting ? "Confirming Booking..." : "Confirm Booking"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
      <Footer />
    </div>
  )
}

export default BookRoom
