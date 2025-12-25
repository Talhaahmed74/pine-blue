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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAuth } from "@/contexts/AuthContext"
import { toast } from "sonner"
import Header from "@/components/Header"
import Footer from "@/components/Footer"
import { CalendarIcon, Users, Mail, Phone, User, ArrowLeft, CreditCard, AlertCircle, Lock } from "lucide-react"
import { format } from "date-fns"
import { sendBookingEmail } from "@/services/emailService"

interface RoomType {
  id: number
  name: string
  base_price: number
  is_available: boolean
  amenities: string[]
  max_adults: number
  max_children: number
}

interface BookingResponse {
  success: boolean
  booking_id: string
  room_number: string
  total_amount: number
  message: string
}

type BookingStep = "details" | "billing" | "confirmation"

const BookRoom = () => {
  const { roomId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [roomType, setRoomType] = useState<RoomType | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [currentStep, setCurrentStep] = useState<BookingStep>("details")
  const [bookingResponse, setBookingResponse] = useState<BookingResponse | null>(null)
  
  // Form data
  const [checkIn, setCheckIn] = useState<Date>()
  const [checkOut, setCheckOut] = useState<Date>()
  const [guestName, setGuestName] = useState("")
  const [guestEmail, setGuestEmail] = useState("")
  const [guestPhone, setGuestPhone] = useState("")
  const [specialRequests, setSpecialRequests] = useState("")
  
  // Billing data
  const [paymentMethod, setPaymentMethod] = useState<"Online" | "Cash" | "Card">("Online")
  const [billingLoading, setBillingLoading] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  
  // Card payment fields (display only)
  const [cardNumber, setCardNumber] = useState("")
  const [expiryDate, setExpiryDate] = useState("")
  const [cvv, setCvv] = useState("")
  const [cardName, setCardName] = useState("")
  
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.replace(/\/+$/, "")

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

  // Format card number with spaces
  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '')
    const matches = v.match(/\d{4,16}/g)
    const match = matches && matches[0] || ''
    const parts = []
    
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4))
    }
    
    if (parts.length) {
      return parts.join(' ')
    } else {
      return v
    }
  }

  // Format expiry date
  const formatExpiryDate = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '')
    if (v.length >= 2) {
      return v.substring(0, 2) + (v.length > 2 ? '/' + v.substring(2, 4) : '')
    }
    return v
  }

  // Redirect if not logged in
  useEffect(() => {
    if (!user) {
      toast.error("Please login to book a room")
      navigate("/?login=true")
      return
    }
  }, [user, navigate])

  // Pre-fill user data
  useEffect(() => {
    if (user) {
      setGuestEmail(user.email || "")
      setGuestName(user.name || "")
      setCardName(user.name || "")
    }
  }, [user])

  // Fetch room type details
  useEffect(() => {
    const fetchRoomType = async () => {
      if (!roomId) return
      try {
        const response = await fetch(`${API_BASE_URL}/availability/room_types/${roomId}`)
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

  const handleCancelBooking = async () => {
    if (!bookingResponse) return
    
    // Show confirmation dialog
    const confirmed = window.confirm(
      `Are you sure you want to cancel booking ${bookingResponse.booking_id}? This action cannot be undone.`
    )
    
    if (!confirmed) return
    
    setCancelling(true)
    try {
      const response = await fetch(`${API_BASE_URL}/bookings/${bookingResponse.booking_id}/cancel`, {
        method: "DELETE"
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        let errorMessage = "Failed to cancel booking"
        try {
          const error = JSON.parse(errorText)
          errorMessage = error.detail || error.message || errorMessage
        } catch (parseError) {
          errorMessage = `Server error (${response.status}): ${errorText}`
        }
        throw new Error(errorMessage)
      }
      
      const result = await response.json()
      toast.success("Booking cancelled successfully")
      
      // Reset state and go back to booking form
      setCurrentStep("details")
      setBookingResponse(null)
      
    } catch (error: any) {
      console.error("Error cancelling booking:", error)
      toast.error(error.message || "Failed to cancel booking")
    } finally {
      setCancelling(false)
    }
  }

  const handleBookingSubmit = async (e: React.FormEvent) => {
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
      // Create booking without billing
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
        status: "pending",
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

      setBookingResponse(booking)
      setCurrentStep("billing")
      toast.success("Booking created! Please complete payment to confirm your reservation.")

    } catch (error: any) {
      console.error("Booking error:", error)
      toast.error(error.message || "Booking failed")
    } finally {
      setSubmitting(false)
    }
  }

  const handleBillingSubmit = async () => {
    if (!bookingResponse || !roomType) return

    setBillingLoading(true)
    try {
      // Include room_price in the billing data as expected by backend
      const billingData = {
        booking_id: bookingResponse.booking_id,
        room_price: roomType.base_price, // Add room_price from roomType
        payment_method: paymentMethod,
        payment_status: "Pending" // Always pending as no payment gateway
      }

      console.log("💳 Creating billing record:", billingData)
      const response = await fetch(`${API_BASE_URL}/billing`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(billingData),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error("❌ Billing error response:", errorText)
        let errorMessage = "Billing failed"
        try {
          const error = JSON.parse(errorText)
          errorMessage = error.detail || error.message || errorMessage
        } catch (parseError) {
          errorMessage = `Server error (${response.status}): ${errorText}`
        }
        throw new Error(errorMessage)
      }

      const billingResult = await response.json()
      console.log("✅ Billing response:", billingResult)

      // Send confirmation email
      try {
        await sendBookingEmail({
          firstName: guestName.split(" ")[0],
          email: guestEmail,
          checkin_date: format(checkIn!, "MMM dd, yyyy"),
          checkout_date: format(checkOut!, "MMM dd, yyyy"),
          roomType: roomType.name,
          roomNumber: bookingResponse.room_number,
          totalAmount: bookingResponse.total_amount,
          paymentStatus: "Pending"
        })
        console.log("✅ Email sent successfully")
      } catch (emailError) {
        console.error("❌ Email sending failed:", emailError)
        // Don't fail the booking if email fails
      }

      setCurrentStep("confirmation")
      toast.success("Payment completed! Your booking is confirmed.")

    } catch (error: any) {
      console.error("Billing error:", error)
      toast.error(error.message || "Payment failed")
    } finally {
      setBillingLoading(false)
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

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-center space-x-4">
            <div className={`flex items-center space-x-2 ${currentStep === "details" ? "text-blue-600" : currentStep === "billing" || currentStep === "confirmation" ? "text-green-600" : "text-gray-400"}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep === "details" ? "bg-blue-600 text-white" : currentStep === "billing" || currentStep === "confirmation" ? "bg-green-600 text-white" : "bg-gray-300"}`}>
                1
              </div>
              <span className="font-medium">Book Room</span>
            </div>
            
            <div className={`w-8 h-0.5 ${currentStep === "billing" || currentStep === "confirmation" ? "bg-green-600" : "bg-gray-300"}`}></div>
            
            <div className={`flex items-center space-x-2 ${currentStep === "billing" ? "text-blue-600" : currentStep === "confirmation" ? "text-green-600" : "text-gray-400"}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep === "billing" ? "bg-blue-600 text-white" : currentStep === "confirmation" ? "bg-green-600 text-white" : "bg-gray-300"}`}>
                2
              </div>
              <span className="font-medium">Payment</span>
            </div>
            
            <div className={`w-8 h-0.5 ${currentStep === "confirmation" ? "bg-green-600" : "bg-gray-300"}`}></div>
            
            <div className={`flex items-center space-x-2 ${currentStep === "confirmation" ? "text-green-600" : "text-gray-400"}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep === "confirmation" ? "bg-green-600 text-white" : "bg-gray-300"}`}>
                3
              </div>
              <span className="font-medium">Confirmation</span>
            </div>
          </div>
        </div>

        {/* Step 1: Booking Details */}
        {currentStep === "details" && (
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
                <form onSubmit={handleBookingSubmit} className="space-y-4">
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
                    {submitting ? "Creating Booking..." : "Create Booking"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 2: Billing/Payment */}
        {currentStep === "billing" && bookingResponse && (
          <div className="max-w-2xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  Complete Payment
                </CardTitle>
                {/* Warning Notice */}
                <div className="flex items-center gap-2 text-orange-600 bg-orange-50 p-3 rounded-lg">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm">
                    Please complete your payment to confirm the booking. Unpaid bookings will be automatically cancelled after 7 minutes.
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Booking Summary */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold mb-3">Booking Summary</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Booking ID:</span>
                      <span className="font-mono">{bookingResponse.booking_id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Room:</span>
                      <span>{bookingResponse.room_number} ({roomType.name})</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Check-in:</span>
                      <span>{checkIn ? format(checkIn, "MMM dd, yyyy") : ""}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Check-out:</span>
                      <span>{checkOut ? format(checkOut, "MMM dd, yyyy") : ""}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Nights:</span>
                      <span>{calculateNights()}</span>
                    </div>
                    <div className="flex justify-between font-semibold text-lg border-t pt-2">
                      <span>Total Amount:</span>
                      <span>₨{bookingResponse.total_amount.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Payment Method */}
                <div>
                  <Label>Payment Method</Label>
                  <Select value={paymentMethod} onValueChange={(value: "Online" | "Cash" | "Card") => setPaymentMethod(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Online">Online Payment</SelectItem>
                      <SelectItem value="Card">Credit/Debit Card</SelectItem>
                      <SelectItem value="Cash">Cash</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Card Payment Fields (Display Only) */}
                {paymentMethod === "Card" && (
                  <div className="space-y-4 bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <div className="flex items-center gap-2 text-blue-700 mb-3">
                      <Lock className="w-4 h-4" />
                      <span className="text-sm font-medium">Card Details (Demo - No Payment Gateway)</span>
                    </div>
                    
                    <div>
                      <Label htmlFor="cardName">Cardholder Name</Label>
                      <Input
                        id="cardName"
                        value={cardName}
                        onChange={(e) => setCardName(e.target.value)}
                        placeholder="John Doe"
                        disabled
                        className="bg-gray-100"
                      />
                    </div>

                    <div>
                      <Label htmlFor="cardNumber">Card Number</Label>
                      <Input
                        id="cardNumber"
                        value={cardNumber}
                        onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                        placeholder="1234 5678 9012 3456"
                        maxLength={19}
                        disabled
                        className="bg-gray-100"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="expiryDate">Expiry Date</Label>
                        <Input
                          id="expiryDate"
                          value={expiryDate}
                          onChange={(e) => setExpiryDate(formatExpiryDate(e.target.value))}
                          placeholder="MM/YY"
                          maxLength={5}
                          disabled
                          className="bg-gray-100"
                        />
                      </div>
                      <div>
                        <Label htmlFor="cvv">CVV</Label>
                        <Input
                          id="cvv"
                          value={cvv}
                          onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').substring(0, 4))}
                          placeholder="123"
                          maxLength={4}
                          disabled
                          className="bg-gray-100"
                        />
                      </div>
                    </div>
                    
                    <div className="text-xs text-blue-600 bg-white p-2 rounded border">
                      <strong>Note:</strong> This is a demo interface. No actual payment will be processed. 
                      Payment status will be marked as "Pending" for all bookings.
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-4">
                  <Button 
                    variant="outline" 
                    onClick={handleCancelBooking}
                    disabled={cancelling}
                    className="flex-1"
                  >
                    {cancelling ? "Cancelling..." : "Cancel Booking"}
                  </Button>
                  <Button 
                    onClick={handleBillingSubmit}
                    disabled={billingLoading}
                    className="flex-1"
                  >
                    {billingLoading ? "Processing..." : `Complete Payment (₨${bookingResponse.total_amount.toLocaleString()})`}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 3: Confirmation */}
        {currentStep === "confirmation" && bookingResponse && (
          <div className="max-w-2xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle className="text-center text-green-600">
                  🎉 Booking Confirmed!
                </CardTitle>
              </CardHeader>
              <CardContent className="text-center space-y-6">
                <div className="bg-green-50 p-6 rounded-lg">
                  <h2 className="text-2xl font-bold text-green-800 mb-2">
                    Thank you for your booking!
                  </h2>
                  <p className="text-green-700">
                    Your room has been reserved and payment has been processed successfully. A confirmation email has been sent to your email address.
                  </p>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg text-left">
                  <h3 className="font-semibold mb-3">Booking Details</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Booking ID:</span>
                      <span className="font-mono">{bookingResponse.booking_id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Room:</span>
                      <span>{bookingResponse.room_number} ({roomType.name})</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Guest:</span>
                      <span>{guestName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Check-in:</span>
                      <span>{checkIn ? format(checkIn, "MMM dd, yyyy") : ""}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Check-out:</span>
                      <span>{checkOut ? format(checkOut, "MMM dd, yyyy") : ""}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Payment Method:</span>
                      <span>{paymentMethod}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Payment Status:</span>
                      <span className="text-orange-600 font-medium">Pending</span>
                    </div>
                    <div className="flex justify-between font-semibold border-t pt-2">
                      <span>Total Amount:</span>
                      <span>₨{bookingResponse.total_amount.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-4">
                  <Button 
                    variant="outline" 
                    onClick={() => navigate("/rooms")}
                    className="flex-1"
                  >
                    Book Another Room
                  </Button>
                  <Button 
                    onClick={() => navigate("/profile")}
                    className="flex-1"
                  >
                    View My Bookings
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
      <Footer />
    </div>
  )
}

export default BookRoom