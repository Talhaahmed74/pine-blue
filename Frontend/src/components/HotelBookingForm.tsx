"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { CalendarIcon, Users, Hotel, CreditCard, FileText, AlertCircle, CheckCircle, X, Loader2 } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { sendBookingEmail } from "@/components/emailService"

interface RoomType {
  id: number
  name: string
  base_price: number
  max_adults: number
  max_children: number
  total_capacity: number
  amenities: string[]
}

interface AvailableRoom {
  room_number: string
  room_type: string
  price: number
  capacity: number
  amenities: string[]
}

// Toast Component
const Toast = ({ message, type, onClose }: { message: string; type: "success" | "error"; onClose: () => void }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose()
    }, 5000)
    return () => clearTimeout(timer)
  }, [onClose])

  const bgColor = type === "success" ? "bg-green-500" : "bg-red-500"
  const icon = type === "success" ? <CheckCircle className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />

  return (
    <div
      className={`fixed top-4 right-4 z-50 ${bgColor} text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 max-w-md`}
    >
      {icon}
      <span className="flex-1">{message}</span>
      <button onClick={onClose} className="text-white hover:text-gray-200">
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}

export const HotelBookingForm = () => {
  const [checkInDate, setCheckInDate] = useState<Date>()
  const [checkOutDate, setCheckOutDate] = useState<Date>()
  const [formData, setFormData] = useState({
    guests: 1,
    roomTypeId: 0, // Changed to use room type ID
    roomNumber: "",
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    status: "confirmed",
    source: "Direct",
    discount: 0,
    vat: 16,
    totalAmount: 0,
    paymentMethod: "Cash",
    paymentStatus: "Pending",
    specialRequests: "", // Added special requests
  })

  const [roomTypes, setRoomTypes] = useState<RoomType[]>([])
  const [availableRooms, setAvailableRooms] = useState<AvailableRoom[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingRooms, setIsLoadingRooms] = useState(false)
  const [isLoadingRoomTypes, setIsLoadingRoomTypes] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null)
  const [dateError, setDateError] = useState("")

  // Fetch room types on component mount
  useEffect(() => {
    fetchRoomTypes()
  }, [])

  // Validate dates whenever they change
  useEffect(() => {
    if (checkInDate && checkOutDate) {
      if (checkInDate >= checkOutDate) {
        setDateError("Check-out date must be after check-in date")
      } else {
        setDateError("")
      }
    } else {
      setDateError("")
    }
  }, [checkInDate, checkOutDate])

  // Fetch available rooms when conditions are met
  useEffect(() => {
    const selectedRoomType = roomTypes.find((rt) => rt.id === formData.roomTypeId)
    if (selectedRoomType && checkInDate && checkOutDate && !dateError) {
      fetchAvailableRooms(selectedRoomType.name)
    } else {
      setAvailableRooms([])
    }
  }, [formData.roomTypeId, checkInDate, checkOutDate, dateError, roomTypes])

  const fetchRoomTypes = async () => {
    setIsLoadingRoomTypes(true)
    try {
      const response = await fetch("http://localhost:8000/room-types/available")
      if (!response.ok) throw new Error("Failed to fetch room types")
      const data = await response.json()
      setRoomTypes(data)
    } catch (err) {
      console.error("Error fetching room types:", err)
      showToast("Failed to load room types", "error")
    } finally {
      setIsLoadingRoomTypes(false)
    }
  }

  const fetchAvailableRooms = async (roomType: string) => {
    if (!checkInDate || !checkOutDate || dateError) return
    setIsLoadingRooms(true)
    try {
      const response = await fetch(
        `http://localhost:8000/available-rooms/${roomType}?check_in=${checkInDate.toISOString().split("T")[0]}&check_out=${checkOutDate.toISOString().split("T")[0]}`,
      )
      if (!response.ok) throw new Error("Failed to fetch available rooms")
      const data = await response.json()
      setAvailableRooms(data.available_rooms || [])
    } catch (err) {
      console.error("Error fetching available rooms:", err)
      setAvailableRooms([])
      showToast("Failed to load available rooms", "error")
    } finally {
      setIsLoadingRooms(false)
    }
  }

  const handleInputChange = (field: string, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }))

    // When room type changes, reset room number and validate guests
    if (field === "roomTypeId") {
      setFormData((prev) => ({ ...prev, roomNumber: "" }))
      // Check if current guest count exceeds new room type capacity
      const selectedRoomType = roomTypes.find((rt) => rt.id === value)
      if (selectedRoomType && formData.guests > selectedRoomType.total_capacity) {
        showToast(`Maximum ${selectedRoomType.total_capacity} guests allowed for ${selectedRoomType.name}`, "error")
        setFormData((prev) => ({ ...prev, guests: selectedRoomType.total_capacity }))
      }
    }

    // Validate guest count when changed
    if (field === "guests") {
      const selectedRoomType = roomTypes.find((rt) => rt.id === formData.roomTypeId)
      if (selectedRoomType && (value as number) > selectedRoomType.total_capacity) {
        showToast(`Maximum ${selectedRoomType.total_capacity} guests allowed for ${selectedRoomType.name}`, "error")
        return // Don't update if exceeds capacity
      }
    }
  }

  // Handle check-in date change with validation
  const handleCheckInChange = (date: Date | undefined) => {
    setCheckInDate(date)
    // If check-out date is before or equal to new check-in date, clear it
    if (date && checkOutDate && date >= checkOutDate) {
      setCheckOutDate(undefined)
    }
  }

  // Handle check-out date change with validation
  const handleCheckOutChange = (date: Date | undefined) => {
    setCheckOutDate(date)
  }

  // Calculate total amount based on room type, discount, and VAT
  const calculateTotal = () => {
    const selectedRoomType = roomTypes.find((rt) => rt.id === formData.roomTypeId)
    if (!selectedRoomType || !checkInDate || !checkOutDate) return 0

    const nights = Math.max((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24), 1)
    const baseAmount = selectedRoomType.base_price * nights
    const discountAmount = (baseAmount * formData.discount) / 100
    const vatAmount = ((baseAmount - discountAmount) * formData.vat) / 100
    return baseAmount - discountAmount + vatAmount
  }

  // Update total when relevant fields change
  useEffect(() => {
    const total = calculateTotal()
    setFormData((prev) => ({ ...prev, totalAmount: total }))
  }, [formData.roomTypeId, formData.discount, formData.vat, checkInDate, checkOutDate, roomTypes])

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate dates before submission
    if (!checkInDate || !checkOutDate) {
      showToast("Please select both check-in and check-out dates", "error")
      return
    }
    if (checkInDate >= checkOutDate) {
      showToast("Check-out date must be after check-in date", "error")
      return
    }
    if (!formData.roomNumber) {
      showToast("Please select a room number", "error")
      return
    }

    // Validate guest capacity
    const selectedRoomType = roomTypes.find((rt) => rt.id === formData.roomTypeId)
    if (selectedRoomType && formData.guests > selectedRoomType.total_capacity) {
      showToast(`Maximum ${selectedRoomType.total_capacity} guests allowed for this room type`, "error")
      return
    }

    setIsLoading(true)
    try {
      // Use the new admin booking format
      const requestData = {
        room_type_id: formData.roomTypeId,
        user_id: null, // Admin bookings have null user_id
        guest_name: `${formData.firstName} ${formData.lastName}`,
        guest_email: formData.email,
        guest_phone: formData.phone,
        check_in: checkInDate?.toISOString().split("T")[0],
        check_out: checkOutDate?.toISOString().split("T")[0],
        total_amount: formData.totalAmount,
        special_requests: formData.specialRequests,
        status: formData.status,
      }

      const response = await fetch("http://localhost:8000/admin/bookings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || "Booking failed")
      }

      const result = await response.json()

      // Send booking email after successful booking
      try {
        await sendBookingEmail({
          ...formData,
          checkin_date: checkInDate?.toISOString().split("T")[0],
          checkout_date: checkOutDate?.toISOString().split("T")[0],
        })
      } catch (emailError) {
        console.error("Email sending failed:", emailError)
        // Don't fail the booking if email fails
      }

      // Show success toast
      showToast(`Booking Successful! Booking ID: ${result.booking_id}`, "success")

      // Reset form
      setFormData({
        guests: 1,
        roomTypeId: 0,
        roomNumber: "",
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        status: "confirmed",
        source: "Direct",
        discount: 0,
        vat: 16,
        totalAmount: 0,
        paymentMethod: "Cash",
        paymentStatus: "Pending",
        specialRequests: "",
      })
      setCheckInDate(undefined)
      setCheckOutDate(undefined)
      setAvailableRooms([])
    } catch (err: any) {
      console.error("Booking error:", err)
      showToast(`Booking Failed: ${err.message}`, "error")
    } finally {
      setIsLoading(false)
    }
  }

  const handleGenerateSlip = () => {
    console.log("Generating slip for:", {
      ...formData,
      checkIn: checkInDate,
      checkOut: checkOutDate,
    })
    showToast("Slip Generated! Your booking slip has been generated and will be downloaded shortly.", "success")
  }

  const selectedRoomType = roomTypes.find((rt) => rt.id === formData.roomTypeId)

  return (
    <>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <Card className="shadow-lg border-blue-100 max-w-4xl mx-auto">
        <CardHeader className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-t-lg">
          <CardTitle className="flex items-center gap-2">
            <Hotel className="h-5 w-5" />
            Admin - Book Room
          </CardTitle>
          <CardDescription className="text-blue-100">Create booking for guests via admin interface</CardDescription>
        </CardHeader>
        <CardContent className="p-4 md:p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Date Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4" />
                  Check-in Date
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !checkInDate && "text-muted-foreground",
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {checkInDate ? format(checkInDate, "PPP") : <span>Pick check-in date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={checkInDate}
                      onSelect={handleCheckInChange}
                      disabled={(date) => date < new Date()}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4" />
                  Check-out Date
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !checkOutDate && "text-muted-foreground",
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {checkOutDate ? format(checkOutDate, "PPP") : <span>Pick check-out date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={checkOutDate}
                      onSelect={handleCheckOutChange}
                      disabled={(date) => !checkInDate || date <= checkInDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Date Error Message */}
            {dateError && (
              <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-md">
                <AlertCircle className="h-4 w-4" />
                <span>{dateError}</span>
              </div>
            )}

            {/* Guests */}
            <div className="space-y-2">
              <Label htmlFor="guests" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Number of Guests
                {selectedRoomType && (
                  <span className="text-sm text-gray-500">
                    (Max: {selectedRoomType.total_capacity} - {selectedRoomType.max_adults}A +{" "}
                    {selectedRoomType.max_children}C)
                  </span>
                )}
              </Label>
              <Input
                id="guests"
                type="number"
                min="1"
                max={selectedRoomType?.total_capacity || 8}
                value={formData.guests}
                onChange={(e) => handleInputChange("guests", Number.parseInt(e.target.value))}
                required
              />
            </div>

            {/* Room Type Selection */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Select Room Type</Label>
              {isLoadingRoomTypes ? (
                <div className="flex items-center gap-2 p-3 bg-blue-50 text-blue-700 rounded-md">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Loading room types...</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {roomTypes.map((roomType) => (
                    <div
                      key={roomType.id}
                      className={`p-4 border rounded-lg cursor-pointer transition-all ${
                        formData.roomTypeId === roomType.id
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 hover:border-blue-300"
                      }`}
                      onClick={() => handleInputChange("roomTypeId", roomType.id)}
                    >
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-2 gap-2">
                        <h3 className="font-medium">{roomType.name}</h3>
                        <span className="font-bold text-blue-600 text-sm sm:text-base">
                          ₨{roomType.base_price.toLocaleString()}/night
                        </span>
                      </div>
                      <div className="text-sm text-gray-600 mb-2">
                        Capacity: {roomType.max_adults} Adults + {roomType.max_children} Children
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {roomType.amenities.map((amenity) => (
                          <Badge key={amenity} variant="secondary" className="text-xs">
                            {amenity}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Room Number Selection */}
            {formData.roomTypeId > 0 && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Hotel className="h-4 w-4" />
                  Available Rooms
                </Label>
                {/* Warning if dates not selected */}
                {(!checkInDate || !checkOutDate) && (
                  <div className="flex items-center gap-2 p-3 bg-yellow-50 text-yellow-700 rounded-md">
                    <AlertCircle className="h-4 w-4" />
                    <span>Please select both check-in and check-out dates to see available rooms.</span>
                  </div>
                )}
                {/* Date error warning */}
                {dateError && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-md">
                    <AlertCircle className="h-4 w-4" />
                    <span>Please fix the date selection to see available rooms.</span>
                  </div>
                )}
                {/* If dates are selected and valid, show available rooms or loading */}
                {checkInDate && checkOutDate && !dateError && (
                  <>
                    {isLoadingRooms ? (
                      <div className="flex items-center gap-2 p-3 bg-blue-50 text-blue-700 rounded-md">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Loading available rooms...</span>
                      </div>
                    ) : availableRooms.length > 0 ? (
                      <Select
                        value={formData.roomNumber}
                        onValueChange={(value) => handleInputChange("roomNumber", value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a room number" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableRooms.map((room) => (
                            <SelectItem key={room.room_number} value={room.room_number}>
                              Room {room.room_number} - ₨{room.price.toLocaleString()}/night
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-md">
                        <AlertCircle className="h-4 w-4" />
                        <span>No rooms available for this type on selected dates</span>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Guest Details */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Guest Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => handleInputChange("firstName", e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => handleInputChange("lastName", e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleInputChange("phone", e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="specialRequests">Special Requests</Label>
                <Input
                  id="specialRequests"
                  value={formData.specialRequests}
                  onChange={(e) => handleInputChange("specialRequests", e.target.value)}
                  placeholder="Any special requests or notes..."
                />
              </div>
            </div>

            <Separator />

            {/* Billing Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Booking Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select value={formData.status} onValueChange={(value) => handleInputChange("status", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="confirmed">Confirmed</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="totalAmount">Total Amount (₨)</Label>
                  <Input
                    id="totalAmount"
                    type="number"
                    value={formData.totalAmount.toFixed(2)}
                    onChange={(e) => handleInputChange("totalAmount", Number.parseFloat(e.target.value) || 0)}
                    className="bg-gray-50"
                  />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col md:flex-row gap-3">
              <Button
                type="submit"
                className="w-full md:flex-1 bg-blue-600 hover:bg-blue-700 h-12 text-base font-medium"
                size="lg"
                disabled={isLoading || dateError !== ""}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CreditCard className="h-5 w-5 mr-2" />
                    Complete Booking
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleGenerateSlip}
                size="lg"
                className="w-full md:w-auto md:min-w-[160px] h-12 text-base font-medium border-2 border-blue-200 hover:border-blue-300 hover:bg-blue-50 bg-transparent"
              >
                <FileText className="h-5 w-5 mr-2" />
                Generate Slip
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </>
  )
}
