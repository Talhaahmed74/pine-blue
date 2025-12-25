"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useSearchParams, Link, useNavigate } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CheckCircle, Calendar, CreditCard, Loader2 } from "lucide-react"
import Header from "@/components/Header"
import Footer from "@/components/Footer"
import { toast } from "sonner"
import { billSettingsApi, type BillingSettings } from "@/apis/BillSetting_api"
import { sendBookingEmail } from "@/services/emailService"
import { format } from "date-fns"

interface BookingDetails {
  id: string
  booking_id: string
  guest_name: string
  guest_email: string
  guest_phone?: string
  check_in: string
  check_out: string
  room_number: string
  room_type: string
  total_amount: number
  special_requests?: string
  status: string
  first_name?: string
  last_name?: string
  email?: string
  phone?: string
  rooms?: {
    name: string
    image_url: string
    amenities: string[]
  }
}

interface BillingFormData {
  room_price: number
  discount: number
  vat: number
  total_amount: number
  payment_method: string
  payment_status: string
  transaction_id: string
  payment_gateway: string
  notes: string
}

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

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams()
  const bookingId = searchParams.get("booking_id")
  const [booking, setBooking] = useState<BookingDetails | null>(null)
  const [billingSettings, setBillingSettings] = useState<BillingSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [billingConfirmed, setBillingConfirmed] = useState(false)
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.replace(/\/+$/, "");
  const [billingForm, setBillingForm] = useState<BillingFormData>({
    room_price: 0,
    discount: 0,
    vat: 0,
    total_amount: 0,
    payment_method: "pending",
    payment_status: "pending",
    transaction_id: "",
    payment_gateway: "",
    notes: "",
  })

  const navigate = useNavigate()

  useEffect(() => {
    const fetchData = async () => {
      if (!bookingId) return

      try {
        console.log("🔍 Fetching booking details for ID:", bookingId)

        // Fetch booking details
        const bookingResponse = await fetch(`${API_BASE_URL}/bookings/${bookingId}`)
        if (!bookingResponse.ok) throw new Error("Booking not found")
        const bookingData = await bookingResponse.json()

        console.log("📋 Booking data:", bookingData)

        // Fetch billing settings
        const settingsResponse = await billSettingsApi.getBillingSettings()
        if (!settingsResponse.success) throw new Error("Failed to fetch billing settings")

        console.log("⚙️ Billing settings:", settingsResponse.data)

        // Normalize booking data (handle different field names)
        const normalizedBooking = {
          ...bookingData,
          guest_name: bookingData.guest_name || `${bookingData.first_name || ""} ${bookingData.last_name || ""}`.trim(),
          guest_email: bookingData.guest_email || bookingData.email,
          guest_phone: bookingData.guest_phone || bookingData.phone?.toString(),
        }

        setBooking(normalizedBooking)
        setBillingSettings(settingsResponse.data)

        // Calculate billing amounts
        const checkIn = new Date(bookingData.check_in)
        const checkOut = new Date(bookingData.check_out)
        const nights = Math.max(1, Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)))

        console.log("📅 Nights calculated:", nights)

        // Try to get room price from multiple sources
        let roomPrice = 0

        // Method 1: Try to get from room type API
        try {
          // First, try to find room type by name to get the ID
          const roomTypesResponse = await fetch(`${API_BASE_URL}/availability/room-types-with-availability`)
          const roomTypesData = await roomTypesResponse.json()
          const matchingRoomType = roomTypesData.find((rt: any) => rt.name === bookingData.room_type)

          if (matchingRoomType) {
            roomPrice = matchingRoomType.base_price
            console.log("💰 Room price from room types API:", roomPrice)
          }
        } catch (error) {
          console.warn("⚠️ Could not fetch room type price:", error)
        }

        // Method 2: Fallback to booking total amount divided by nights
        if (!roomPrice || roomPrice <= 0) {
          roomPrice = (bookingData.total_amount || 0) / nights
          console.log("💰 Room price calculated from booking total:", roomPrice)
        }

        // Method 3: Default fallback
        if (!roomPrice || roomPrice <= 0 || isNaN(roomPrice)) {
          roomPrice = 5000 // Default room price
          console.log("💰 Using default room price:", roomPrice)
        }

        // Ensure all values are valid numbers
        const discount = Number(settingsResponse.data.discount) || 0
        const vat = Number(settingsResponse.data.vat) || 0

        // Calculate with current settings
        const baseAmount = roomPrice * nights
        const discountAmount = baseAmount * (discount / 100)
        const discountedAmount = baseAmount - discountAmount
        const vatAmount = discountedAmount * (vat / 100)
        const totalAmount = discountedAmount + vatAmount

        console.log("🧮 Billing calculations:", {
          roomPrice,
          nights,
          baseAmount,
          discount,
          discountAmount,
          vat,
          vatAmount,
          totalAmount,
        })

        setBillingForm({
          room_price: roomPrice,
          discount: discount,
          vat: vat,
          total_amount: totalAmount,
          payment_method: "pending",
          payment_status: "pending",
          transaction_id: "",
          payment_gateway: "",
          notes: "",
        })

        toast.success("Booking confirmed! Please complete billing details.")
      } catch (error: any) {
        toast.error("Error loading booking details")
        console.error("❌ Error fetching data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [bookingId])

  useEffect(() => {
    const handleBeforeUnload = async () => {
      if (!billingConfirmed && booking?.booking_id) {
        try {
          await fetch(`${API_BASE_URL}/bookings/${booking.booking_id}/rollback`, {
            method: "DELETE",
          })
          console.log("🔁 Booking rolled back on unload")
        } catch (err) {
          console.error("❌ Failed to rollback booking on unload:", err)
        }
      }
    }
  
    const handleUnload = (e: BeforeUnloadEvent) => {
      handleBeforeUnload()
      e.preventDefault()
      e.returnValue = ""
    }
  
    window.addEventListener("beforeunload", handleUnload)
    return () => {
      window.removeEventListener("beforeunload", handleUnload)
    }
  }, [booking?.booking_id])
  

  const handleBillingSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!booking) return

    // Validate billing form data
    if (!billingForm.room_price || billingForm.room_price <= 0) {
      toast.error("Invalid room price")
      return
    }

    if (!billingForm.total_amount || billingForm.total_amount <= 0) {
      toast.error("Invalid total amount")
      return
    }

    setSubmitting(true)
    try {
      console.log("💳 Submitting billing data:", {
        booking_id: booking.booking_id,
        room_price: billingForm.room_price,
        payment_method: billingForm.payment_method,
        payment_status: billingForm.payment_status,
      })

      const response = await billSettingsApi.createBilling({
        booking_id: booking.booking_id,
        room_price: billingForm.room_price,
        payment_method: billingForm.payment_method,
        payment_status: billingForm.payment_status,
      })

      console.log("✅ Billing response:", response)

      // Send confirmation email after successful billing
      try {
        const checkIn = new Date(booking.check_in)
        const checkOut = new Date(booking.check_out)

        await sendBookingEmail({
          firstName: booking.guest_name.split(" ")[0] || "Guest",
          email: booking.guest_email,
          checkin_date: format(checkIn, "MMM dd, yyyy"),
          checkout_date: format(checkOut, "MMM dd, yyyy"),
          roomType: booking.room_type,
          roomNumber: booking.room_number,
          totalAmount: billingForm.total_amount,
          paymentStatus: "Confirmed",
        })
      } catch (emailError) {
        console.error("Email sending failed:", emailError)
        // Don't fail the billing if email fails
      }
      setBillingConfirmed(true)
      toast.success("Billing completed and booking confirmed! Confirmation email sent.")

      // Redirect to dashboard or show success message
      setTimeout(() => {
        navigate("/dashboard")
      }, 2000)
    } catch (error: any) {
      toast.error("Failed to complete billing")
      console.error("❌ Billing error:", error)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-16 text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading booking details...</p>
        </div>
        <Footer />
      </div>
    )
  }

  if (!booking) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Booking Not Found</h1>
          <Link to="/">
            <Button>Go Home</Button>
          </Link>
        </div>
        <Footer />
      </div>
    )
  }

  const calculateNights = () => {
    const checkIn = new Date(booking.check_in)
    const checkOut = new Date(booking.check_out)
    return Math.max(1, Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)))
  }

  // Safe calculations with fallbacks
  const nights = calculateNights()
  const roomPrice = Number(billingForm.room_price) || 0
  const discount = Number(billingForm.discount) || 0
  const vat = Number(billingForm.vat) || 0

  const baseAmount = roomPrice * nights
  const discountAmount = baseAmount * (discount / 100)
  const discountedAmount = baseAmount - discountAmount
  const vatAmount = discountedAmount * (vat / 100)
  const totalAmount = Number(billingForm.total_amount) || 0

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Booking Confirmed!</h1>
            <p className="text-gray-600">Please complete your billing information</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Booking Details */}
            <Card>
              <CardHeader>
                <CardTitle>Booking Details</CardTitle>
                <p className="text-sm text-gray-500">Booking ID: {booking.booking_id}</p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center space-x-4">
                  <img
                    src={getImageForRoomType(booking.room_type) || "/placeholder.svg?height=80&width=80"}
                    alt={booking.room_type}
                    className="w-20 h-20 object-cover rounded-lg"
                  />
                  <div>
                    <h3 className="font-semibold text-lg">{booking.rooms?.name || booking.room_type}</h3>
                    <p className="text-sm text-gray-600">Room: {booking.room_number}</p>
                    <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-4 w-4" />
                        <span>
                          {new Date(booking.check_in).toLocaleDateString()} -{" "}
                          {new Date(booking.check_out).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-semibold mb-2">Guest Information:</h4>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>
                      <strong>Name:</strong> {booking.guest_name}
                    </p>
                    <p>
                      <strong>Email:</strong> {booking.guest_email}
                    </p>
                    {booking.guest_phone && (
                      <p>
                        <strong>Phone:</strong> {booking.guest_phone}
                      </p>
                    )}
                    {booking.special_requests && (
                      <p>
                        <strong>Special Requests:</strong> {booking.special_requests}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Billing Form */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Billing Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleBillingSubmit} className="space-y-4">
                  {/* Billing Calculation Display */}
                  <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                    <h4 className="font-semibold text-sm">Billing Breakdown</h4>
                    <div className="text-sm space-y-1">
                      <div className="flex justify-between">
                        <span>Room Price ({nights} nights):</span>
                        <span>Rs {baseAmount.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-green-600">s
                        <span>Discount ({discount}%):</span>
                        <span>-Rs {discountAmount.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>VAT ({vat}%):</span>
                        <span>Rs {vatAmount.toLocaleString()}</span>
                      </div>
                      <div className="border-t pt-1 flex justify-between font-semibold">
                        <span>Total Amount:</span>
                        <span>Rs {totalAmount.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Read-only billing settings */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="discount">Discount (%)</Label>
                      <Input id="discount" type="number" value={discount.toString()} disabled className="bg-gray-100" />
                    </div>
                    <div>
                      <Label htmlFor="vat">VAT (%)</Label>
                      <Input id="vat" type="number" value={vat.toString()} disabled className="bg-gray-100" />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="total_amount">Total Amount</Label>
                    <Input
                      id="total_amount"
                      type="number"
                      value={totalAmount.toString()}
                      disabled
                      className="bg-gray-100 font-semibold"
                    />
                  </div>

                  <div>
                    <Label htmlFor="payment_status">Payment Status</Label>
                    <Input id="payment_status" value={billingForm.payment_status} disabled className="bg-gray-100" />
                  </div>

                  {/* Future payment gateway fields (disabled) */}
                  <div className="space-y-4 opacity-50">
                    <h4 className="font-semibold text-sm text-gray-500">Payment Gateway Integration (Coming Soon)</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="transaction_id">Transaction ID</Label>
                        <Input
                          id="transaction_id"
                          value={billingForm.transaction_id}
                          disabled
                          placeholder="Will be auto-generated"
                        />
                      </div>
                      <div>
                        <Label htmlFor="payment_gateway">Payment Gateway</Label>
                        <Input
                          id="payment_gateway"
                          value={billingForm.payment_gateway}
                          disabled
                          placeholder="Stripe/PayPal/etc."
                        />
                      </div>
                    </div>
                  </div>

                  <Button type="submit" className="w-full" disabled={submitting}>
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Creating Billing Record...
                      </>
                    ) : (
                      "Complete Billing"
                    )}
                  </Button>
                </form>

                <div className="flex space-x-4 mt-6">
                  <Link to="/dashboard" className="flex-1">
                    <Button variant="outline" className="w-full bg-transparent">
                      View My Bookings
                    </Button>
                  </Link>
                  <Link to="/" className="flex-1">
                    <Button variant="outline" className="w-full bg-transparent">
                      Back to Home
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  )
}

export default PaymentSuccess
