import type React from "react"
import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import {
  CalendarIcon,
  Users,
  Hotel,
  CreditCard,
  FileText,
  AlertCircle,
  CheckCircle,
  X,
  Loader2,
  Search,
  UserCheck,
  Calculator,
} from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { sendBookingEmail } from "@/components/emailService"
import { billSettingsApi, type BillingSettings } from "@/apis/BillSetting_api"

// Types
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

interface Customer {
  id: number
  first_name: string
  last_name: string
  email: string
  phone: string
}

interface FormData {
  guests: number
  roomTypeId: number
  roomNumber: string
  firstName: string
  lastName: string
  email: string
  phone: string
  status: string
  source: string
  discount: number
  vat: number
  totalAmount: number
  paymentMethod: string
  paymentStatus: string
  specialRequests: string
}

// Toast Component
const Toast = ({ message, type, onClose }: { message: string; type: "success" | "error"; onClose: () => void }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000)
    return () => clearTimeout(timer)
  }, [onClose])

  const bgColor = type === "success" ? "bg-green-500" : "bg-red-500"
  const icon = type === "success" ? <CheckCircle className="h-5 w-5" /> : <AlertCircle className="h-4 w-4" />

  return (
    <div className={`fixed top-4 right-4 z-50 ${bgColor} text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 max-w-md`}>
      {icon}
      <span className="flex-1">{message}</span>
      <button onClick={onClose} className="text-white hover:text-gray-200">
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}

export const HotelBookingForm = () => {
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.replace(/\/+$/, "")

  // State Management
  const [checkInDate, setCheckInDate] = useState<Date>()
  const [checkOutDate, setCheckOutDate] = useState<Date>()
  const [formData, setFormData] = useState<FormData>({
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
    vat: 0,
    totalAmount: 0,
    paymentMethod: "Cash",
    paymentStatus: "Pending",
    specialRequests: "",
  })

  // Data States
  const [billingSettings, setBillingSettings] = useState<BillingSettings | null>(null)
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([])
  const [availableRooms, setAvailableRooms] = useState<AvailableRoom[]>([])
  const [selectedRoom, setSelectedRoom] = useState<AvailableRoom | null>(null)

  // Customer Search States
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [customerSearch, setCustomerSearch] = useState("")
  const [customers, setCustomers] = useState<Customer[]>([])
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false)
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null)
  const customerSearchRef = useRef<HTMLDivElement>(null)

  // Loading States
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingRooms, setIsLoadingRooms] = useState(false)
  const [isLoadingRoomTypes, setIsLoadingRoomTypes] = useState(false)
  const [isSearchingCustomers, setIsSearchingCustomers] = useState(false)
  const [loadingBillingSettings, setLoadingBillingSettings] = useState(false)

  // UI States
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null)
  const [dateError, setDateError] = useState("")

  // Initialize data on mount
  useEffect(() => {
    fetchBillingSettings()
    fetchRoomTypes()
  }, [])

  // Handle click outside for customer dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (customerSearchRef.current && !customerSearchRef.current.contains(event.target as Node)) {
        setShowCustomerDropdown(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Date validation effect
  useEffect(() => {
    if (checkInDate && checkOutDate) {
      setDateError(checkInDate >= checkOutDate ? "Check-out date must be after check-in date" : "")
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

  // Customer search with debounce
  useEffect(() => {
    if (searchTimeout) clearTimeout(searchTimeout)
    
    if (customerSearch.length >= 2) {
      const timeout = setTimeout(() => searchCustomers(customerSearch), 300)
      setSearchTimeout(timeout)
    } else {
      setCustomers([])
      setShowCustomerDropdown(false)
    }
    
    return () => {
      if (searchTimeout) clearTimeout(searchTimeout)
    }
  }, [customerSearch])

  // Update form data with billing settings
  useEffect(() => {
    if (billingSettings) {
      setFormData((prev) => ({
        ...prev,
        discount: billingSettings.discount,
        vat: billingSettings.vat,
      }))
    }
  }, [billingSettings])

  // Calculate total when relevant fields change
  useEffect(() => {
    const total = calculateTotal()
    setFormData((prev) => ({ ...prev, totalAmount: total }))
  }, [formData.roomTypeId, formData.discount, formData.vat, checkInDate, checkOutDate, roomTypes])

  // API Functions
  const fetchBillingSettings = async () => {
    setLoadingBillingSettings(true)
    try {
      const response = await billSettingsApi.getBillingSettings()
      if (response.success) {
        setBillingSettings(response.data)
        console.log("✅ Billing settings loaded:", response.data)
      } else {
        throw new Error("Failed to fetch billing settings")
      }
    } catch (err) {
      console.error("Error fetching billing settings:", err)
      showToast("Failed to load billing settings", "error")
      setBillingSettings({ vat: 13, discount: 0 } as BillingSettings)
    } finally {
      setLoadingBillingSettings(false)
    }
  }

  const fetchRoomTypes = async () => {
    setIsLoadingRoomTypes(true)
    try {
      const response = await fetch(`${API_BASE_URL}/availability/room-types-with-availability`)
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
        `${API_BASE_URL}/availability/available-rooms/${roomType}?check_in=${checkInDate.toISOString().split("T")[0]}&check_out=${checkOutDate.toISOString().split("T")[0]}`,
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

  const searchCustomers = async (search: string) => {
    setIsSearchingCustomers(true)
    try {
      const response = await fetch(`${API_BASE_URL}/users?search=${encodeURIComponent(search)}`)
      if (!response.ok) throw new Error("Failed to search customers")
      const data = await response.json()
      setCustomers(data.users || [])
      setShowCustomerDropdown(true)
    } catch (err) {
      console.error("Error searching customers:", err)
      setCustomers([])
      showToast("Failed to search customers", "error")
    } finally {
      setIsSearchingCustomers(false)
    }
  }

  // Utility Functions
  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type })
  }

  const calculateTotal = (): number => {
    const selectedRoomType = roomTypes.find((rt) => rt.id === formData.roomTypeId)
    if (!selectedRoomType || !checkInDate || !checkOutDate) return 0

    const nights = Math.max((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24), 1)
    const baseAmount = selectedRoomType.base_price * nights
    const discountAmount = (baseAmount * formData.discount) / 100
    const vatAmount = ((baseAmount - discountAmount) * formData.vat) / 100
    return baseAmount - discountAmount + vatAmount
  }

  const getBillingBreakdown = () => {
    const selectedRoomType = roomTypes.find((rt) => rt.id === formData.roomTypeId)
    if (!selectedRoomType || !checkInDate || !checkOutDate) {
      return { nights: 0, baseAmount: 0, discountAmount: 0, vatAmount: 0, totalAmount: 0 }
    }

    const nights = Math.max((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24), 1)
    const baseAmount = selectedRoomType.base_price * nights
    const discountAmount = (baseAmount * formData.discount) / 100
    const discountedAmount = baseAmount - discountAmount
    const vatAmount = (discountedAmount * formData.vat) / 100
    const totalAmount = discountedAmount + vatAmount

    return { nights, baseAmount, discountAmount, vatAmount, totalAmount }
  }

  const resetForm = () => {
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
      discount: billingSettings?.discount || 0,
      vat: billingSettings?.vat || 0,
      totalAmount: 0,
      paymentMethod: "Cash",
      paymentStatus: "Pending",
      specialRequests: "",
    })
    setCheckInDate(undefined)
    setCheckOutDate(undefined)
    setAvailableRooms([])
    setSelectedCustomer(null)
    setCustomerSearch("")
  }

  // Event Handlers
  const handleCustomerSelect = (customer: Customer) => {
    setSelectedCustomer(customer)
    setCustomerSearch("")
    setShowCustomerDropdown(false)
    setFormData((prev) => ({
      ...prev,
      firstName: customer.first_name,
      lastName: customer.last_name,
      email: customer.email,
      phone: customer.phone,
    }))
  }

  const handleCustomerClear = () => {
    setSelectedCustomer(null)
    setCustomerSearch("")
    setShowCustomerDropdown(false)
    setFormData((prev) => ({
      ...prev,
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
    }))
  }

  const handleInputChange = (field: string, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    
    if (field === "roomTypeId") {
      setFormData((prev) => ({ ...prev, roomNumber: "" }))
      const selectedRoomType = roomTypes.find((rt) => rt.id === value)
      if (selectedRoomType && formData.guests > selectedRoomType.total_capacity) {
        showToast(`Maximum ${selectedRoomType.total_capacity} guests allowed for ${selectedRoomType.name}`, "error")
        setFormData((prev) => ({ ...prev, guests: selectedRoomType.total_capacity }))
      }
    }
    
    if (field === "roomNumber") {
      const matchedRoom = availableRooms.find((room) => room.room_number === value)
      setSelectedRoom(matchedRoom || null)
    }
    
    if (field === "guests") {
      const selectedRoomType = roomTypes.find((rt) => rt.id === formData.roomTypeId)
      if (selectedRoomType && (value as number) > selectedRoomType.total_capacity) {
        showToast(`Maximum ${selectedRoomType.total_capacity} guests allowed for ${selectedRoomType.name}`, "error")
        return
      }
    }
  }

  const handleCheckInChange = (date: Date | undefined) => {
    setCheckInDate(date)
    if (date && checkOutDate && date >= checkOutDate) {
      setCheckOutDate(undefined)
    }
  }

  const handleCheckOutChange = (date: Date | undefined) => {
    setCheckOutDate(date)
  }

  // Updated Admin Booking Handler - Separated Booking and Billing
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
      // Step 1: Create booking with admin endpoint (creates both booking and billing)
      const requestData = {
        room_type_id: formData.roomTypeId,
        room_number: selectedRoom?.room_number || formData.roomNumber,
        user_id: selectedCustomer?.id || null, // Use selected customer ID or null for walk-ins
        guest_name: `${formData.firstName} ${formData.lastName}`,
        guest_email: formData.email,
        guest_phone: formData.phone,
        check_in: checkInDate?.toISOString().split("T")[0],
        check_out: checkOutDate?.toISOString().split("T")[0],
        total_amount: formData.totalAmount,
        special_requests: formData.specialRequests,
        status: formData.status,
        guests: formData.guests,
        payment_method: formData.paymentMethod,
        payment_status: formData.paymentStatus,
      }

      console.log("📤 Sending admin booking data:", requestData)

      const response = await fetch(`${API_BASE_URL}/admin/bookings`, {
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
      console.log("✅ Admin booking response:", result)

      // Send booking email after successful booking
      try {
        const selectedRoomType = roomTypes.find((rt) => rt.id === formData.roomTypeId)
        await sendBookingEmail({
          ...formData,
          roomTypeName: selectedRoomType?.name || "N/A",
          selectedCustomer,
          checkin_date: checkInDate?.toISOString().split("T")[0],
          checkout_date: checkOutDate?.toISOString().split("T")[0],
        })
      } catch (emailError) {
        console.error("Email sending failed:", emailError)
        // Don't fail the booking if email fails
      }

      // Show success toast with customer info
      const customerInfo = selectedCustomer
        ? ` for ${selectedCustomer.first_name} ${selectedCustomer.last_name}`
        : " (Walk-in)"
      
      showToast(
        `Admin Booking Successful ${customerInfo}! Booking ID: ${result.booking_id}, Room: ${result.room_number}, Amount: ₨${result.total_amount}`,
        "success"
      )

      // Reset form
      resetForm()
      
    } catch (err: any) {
      console.error("Admin booking error:", err)
      showToast(`Admin Booking Failed: ${err.message}`, "error")
    } finally {
      setIsLoading(false)
    }
  }

  // Optional: Separate billing update function for admin if needed
  const handleUpdateBilling = async (bookingId: string, billingData: any) => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/billing/${bookingId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(billingData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || "Billing update failed")
      }

      const result = await response.json()
      showToast("Billing updated successfully", "success")
      return result
      
    } catch (error: any) {
      console.error("Billing update error:", error)
      showToast(`Billing Update Failed: ${error.message}`, "error")
      throw error
    }
  }

  // Optional: Manual billing creation for existing bookings
  const handleCreateBillingForBooking = async (bookingId: string, paymentData: any) => {
    try {
      const billingData = {
        booking_id: bookingId,
        payment_method: paymentData.paymentMethod || "Admin",
        payment_status: paymentData.paymentStatus || "Pending",
      }

      const response = await fetch(`${API_BASE_URL}/billing`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(billingData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || "Billing creation failed")
      }

      const result = await response.json()
      showToast(`Billing created successfully for booking ${bookingId}`, "success")
      return result
      
    } catch (error: any) {
      console.error("Billing creation error:", error)
      showToast(`Billing Creation Failed: ${error.message}`, "error")
      throw error
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

  // Computed values
  const selectedRoomType = roomTypes.find((rt) => rt.id === formData.roomTypeId)
  const billingBreakdown = getBillingBreakdown()

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
            {/* Customer Search Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Customer Selection</h3>
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Search className="h-4 w-4" />
                  Search Existing Customer (Optional)
                </Label>
                <p className="text-sm text-gray-600">
                  Search by email or phone to book for existing customers, or leave empty for walk-in bookings
                </p>
                
                {/* Selected Customer Display */}
                {selectedCustomer && (
                  <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <UserCheck className="h-4 w-4 text-blue-600" />
                      <span className="font-medium text-blue-800">
                        {selectedCustomer.first_name} {selectedCustomer.last_name} - {selectedCustomer.email}
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleCustomerClear}
                      className="text-blue-600 hover:text-blue-800 hover:bg-blue-100"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}

                {/* Customer Search Input */}
                {!selectedCustomer && (
                  <div className="relative" ref={customerSearchRef}>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Type email or phone number..."
                        value={customerSearch}
                        onChange={(e) => setCustomerSearch(e.target.value)}
                        className="pl-10"
                      />
                      {isSearchingCustomers && (
                        <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />
                      )}
                    </div>
                    
                    {/* Customer Dropdown */}
                    {showCustomerDropdown && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        {customers.length > 0 ? (
                          customers.map((customer) => (
                            <button
                              key={customer.id}
                              type="button"
                              className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 focus:bg-blue-50 focus:outline-none"
                              onClick={() => handleCustomerSelect(customer)}
                            >
                              <div className="font-medium text-gray-900">
                                {customer.first_name} {customer.last_name}
                              </div>
                              <div className="text-sm text-gray-600">
                                {customer.email} • {customer.phone}
                              </div>
                            </button>
                          ))
                        ) : (
                          <div className="px-4 py-3 text-gray-500 text-center">
                            {isSearchingCustomers ? "Searching..." : "No customers found"}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <Separator />

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
                
                {/* Available rooms selection */}
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
                <Textarea
                  id="specialRequests"
                  value={formData.specialRequests}
                  onChange={(e) => handleInputChange("specialRequests", e.target.value)}
                  placeholder="Any special requests or notes (e.g., early check-in, room preferences, dietary requirements)..."
                  rows={3}
                  className="resize-none"
                />
              </div>
            </div>

            <Separator />

            {/* Billing Details Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Billing Details
              </h3>

              {loadingBillingSettings ? (
                <div className="flex items-center gap-2 p-3 bg-blue-50 text-blue-700 rounded-md">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Loading billing settings...</span>
                </div>
              ) : (
                <>
                  {/* Current Billing Settings (Read-only) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="discount" className="text-sm font-medium">
                        Discount (%)
                      </Label>
                      <Input
                        id="discount"
                        type="number"
                        value={formData.discount}
                        disabled
                        className="bg-gray-100 text-gray-700"
                      />
                      <p className="text-xs text-gray-500">Current system discount rate</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="vat" className="text-sm font-medium">
                        VAT (%)
                      </Label>
                      <Input
                        id="vat"
                        type="number"
                        value={formData.vat}
                        disabled
                        className="bg-gray-100 text-gray-700"
                      />
                      <p className="text-xs text-gray-500">Current system VAT rate</p>
                    </div>
                  </div>

                  {/* Billing Breakdown */}
                  {selectedRoomType && checkInDate && checkOutDate && billingBreakdown.nights > 0 && (
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
                      <h4 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                        <CreditCard className="h-4 w-4" />
                        Billing Breakdown
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-700">
                            Room Price ({billingBreakdown.nights} night{billingBreakdown.nights > 1 ? "s" : ""}):
                          </span>
                          <span className="font-medium">₨{billingBreakdown.baseAmount.toLocaleString()}</span>
                        </div>
                        {formData.discount > 0 && (
                          <div className="flex justify-between items-center text-green-700">
                            <span>Discount ({formData.discount}%):</span>
                            <span className="font-medium">-₨{billingBreakdown.discountAmount.toLocaleString()}</span>
                          </div>
                        )}
                        <div className="flex justify-between items-center">
                          <span className="text-gray-700">VAT ({formData.vat}%):</span>
                          <span className="font-medium">₨{billingBreakdown.vatAmount.toLocaleString()}</span>
                        </div>
                        
                        {/* Payment Method and Status */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                          <div className="space-y-2">
                            <Label htmlFor="paymentMethod" className="text-sm font-medium">
                              Payment Method
                            </Label>
                            <Select 
                              value={formData.paymentMethod} 
                              onValueChange={(value) => handleInputChange("paymentMethod", value)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select payment method" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Cash">Cash</SelectItem>
                                <SelectItem value="Card">Card</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="paymentStatus" className="text-sm font-medium">
                              Payment Status
                            </Label>
                            <Select 
                              value={formData.paymentStatus} 
                              onValueChange={(value) => handleInputChange("paymentStatus", value)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select payment status" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Pending">Pending</SelectItem>
                                <SelectItem value="Paid">Paid</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        
                        <Separator className="my-2" />
                        <div className="flex justify-between items-center text-lg font-bold text-blue-900">
                          <span>Total Amount:</span>
                          <span>₨{billingBreakdown.totalAmount.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            <Separator />

            {/* Booking Information */}
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
                    className="bg-gray-50 font-semibold"
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