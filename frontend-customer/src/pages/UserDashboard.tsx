"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/AuthContext"
import Header from "@/components/Header"
import Footer from "@/components/Footer"
import { Calendar, Hotel, CreditCard } from 'lucide-react'
import { format } from "date-fns"

interface BookingData {
  booking_id: string
  user_id: number | null
  check_in: string
  check_out: string
  guests: number
  room_number: string
  room_type: string
  room_type_name: string
  first_name: string
  last_name: string
  email: string
  phone: string
  status: string
  status_display: string
  source: string
  special_requests: string | null
  created_at: string
  updated_at: string | null
  room_base_price: number
  room_amenities: string[]
  max_adults: number
  max_children: number
  total_capacity: number
  room_price: number
  discount: number
  vat: number
  total_amount: number
  payment_method: string
  payment_status: string
  is_cancelled: boolean
  nights: number
  user_name: string | null
  user_email: string
}

interface DashboardStats {
  total_bookings: number
  confirmed_bookings: number
  completed_bookings: number
  upcoming_bookings: number
  total_spent: number
}

interface DashboardData {
  user_id?: number | null
  user_email?: string
  statistics: DashboardStats
  bookings: BookingData[]
  upcoming_bookings: BookingData[]
}

const UserDashboard = () => {
  const { user } = useAuth()
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
  useEffect(() => {
    const fetchUserDashboard = async () => {
      if (!user?.email) {
        setLoading(false)
        return
      }

      try {
        // Use email-based endpoint since we might not have user_id
        const response = await fetch(`${API_BASE_URL}/user/email/${encodeURIComponent(user.email)}/dashboard`)

        if (!response.ok) {
          throw new Error(`Failed to fetch dashboard data: ${response.statusText}`)
        }

        const data = await response.json()
        setDashboardData(data)
      } catch (err: any) {
        console.error("Error fetching dashboard:", err)
        setError(err.message || "Failed to load dashboard data")
      } finally {
        setLoading(false)
      }
    }

    fetchUserDashboard()
  }, [user])

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "confirmed":
        return "default"
      case "pending":
        return "secondary"
      case "cancelled":
        return "destructive"
      case "completed":
        return "default"
      default:
        return "default"
    }
  }

  const formatCurrency = (amount?: number | null) => {
    if (typeof amount !== "number") return "₨0"; // or "—" or "Pending"
    return `₨${amount.toLocaleString()}`;
  };
  

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-16">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading your dashboard...</p>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-16">
          <div className="text-center">
            <div className="text-red-600 mb-4">
              <Hotel className="h-12 w-12 mx-auto mb-2" />
              <p className="text-lg font-semibold">Error Loading Dashboard</p>
              <p className="text-sm">{error}</p>
            </div>
            <Button onClick={() => window.location.reload()}>Try Again</Button>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  if (!dashboardData) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-16">
          <div className="text-center">
            <p className="text-gray-600">No dashboard data available</p>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  const { statistics, bookings = [] } = dashboardData || {};
  const upcomingStaysCount = bookings.filter(
    b => b.status === "confirmed" && new Date(b.check_in) >= new Date()
  ).length;
  

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">My Dashboard</h1>
          <p className="text-xl text-gray-600">Welcome back, {user?.email}</p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
              <Hotel className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.total_bookings}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Confirmed Bookings</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.confirmed_bookings}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Upcoming Stays</CardTitle>
              {/* Clock icon removed as per updates */}
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{upcomingStaysCount}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(statistics.total_spent)}</div>
            </CardContent>
          </Card>
        </div>

        
        {/* All Bookings */}
        <Card>
          <CardHeader>
            <CardTitle>My Bookings</CardTitle>
          </CardHeader>
          <CardContent>
            {bookings.length === 0 ? (
              <div className="text-center py-8">
                <Hotel className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-4">No bookings found</p>
                <Button onClick={() => (window.location.href = "/rooms")}>Browse Rooms</Button>
              </div>
            ) : (
              <div className="space-y-4">
                {bookings.map((booking) => (
                  <div key={booking.booking_id} className="border rounded-lg p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-4">
                        <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center">
                          <Hotel className="h-8 w-8 text-gray-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg">{booking.room_type_name}</h3>
                          <p className="text-gray-600 flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {format(new Date(booking.check_in), "MMM dd, yyyy")} -{" "}
                            {format(new Date(booking.check_out), "MMM dd, yyyy")}
                          </p>
                          <p className="text-sm text-gray-500">Booking ID: {booking.booking_id}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant={getStatusColor(booking.status)} className="mb-2">
                          {booking.status_display}
                        </Badge>
                        <p className="text-lg font-bold">{formatCurrency(booking.total_amount)}</p>
                        <p className="text-sm text-gray-500">Payment: {booking.payment_status}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        {/* MapPin icon removed as per updates */}
                        <span>Room {booking.room_number}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {/* Users icon removed as per updates */}
                        <span>
                          {booking.guests} guests • {booking.nights} nights
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {/* CreditCard icon removed as per updates */}
                        <span>{booking.payment_method}</span>
                      </div>
                    </div>

                    {booking.special_requests && (
                      <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <div className="flex items-start gap-2">
                          {/* MessageSquare icon removed as per updates */}
                          <div>
                            <p className="text-sm font-medium text-yellow-800">Special Requests:</p>
                            <p className="text-sm text-yellow-700">{booking.special_requests}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
                      <span>Booked on {format(new Date(booking.created_at), "MMM dd, yyyy")}</span>
                      <span>Source: {booking.source}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Footer />
    </div>
  )
}

export default UserDashboard
