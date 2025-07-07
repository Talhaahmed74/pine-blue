import { useEffect, useState } from "react";
import axios from "axios";
import { useToast } from "@/hooks/use-toast";
import {
  Card, CardContent, CardHeader, CardTitle
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import {
  Calendar, Users, DollarSign, Hotel, Eye, Trash2, Loader2
} from "lucide-react";
import { BookingUpdateForm } from "@/components/UpdateBookingForm";

export const BookingDashboard = () => {
  const { toast } = useToast();
  const [stats, setStats] = useState([]);
  const [recentBookings, setRecentBookings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingBookingId, setDeletingBookingId] = useState(null);

  const backendURL = import.meta.env.VITE_BACKEND_URL;
  const handleDelete = async (bookingId: string) => {
    if (!window.confirm(`Are you sure you want to delete booking ${bookingId}? This action cannot be undone.`)) return;
  
    setDeletingBookingId(bookingId);
    
    try {
      const response = await axios.delete(`${backendURL}/delete-booking/${bookingId}`);
      
      // Remove the deleted booking from the list
      setRecentBookings((prev) => prev.filter((b) => b.id !== bookingId));
  
      toast({
        title: "Booking Deleted",
        description: `Booking ${bookingId} was successfully removed.`,
        variant: "default",
      });
    } catch (err) {
      console.error("Delete failed:", err);
      toast({
        title: "Deletion Failed",
        description: "Failed to delete the booking. Please try again.",
        variant: "destructive",
      });
    } finally {
      setDeletingBookingId(null);
    }
  };

  // Handle booking update from the form
  const handleBookingUpdate = (updatedBooking: any) => {
    setRecentBookings((prev) => 
      prev.map((booking) => 
        booking.id === updatedBooking.id ? updatedBooking : booking
      )
    );
  };

  // ✅ Fetch stats and bookings
  useEffect(() => {
    const fetchDashboard = async () => {
      setIsLoading(true);
      try {
        const [summaryRes, bookingsRes] = await Promise.all([
          axios.get("${backendURL}/dashboard/summary"),
          axios.get("${backendURL}/dashboard/bookings")
        ]);

        const summary = summaryRes.data;
        const bookings = bookingsRes.data.bookings.slice(0, 10); // Get 4 recent

        setStats([
          {
            title: "Total Bookings",
            value: summary.total_bookings,
            change: "+12%",
            icon: Calendar,
            color: "text-blue-600",
            bgColor: "bg-blue-50"
          },
          {
            title: "Occupied Rooms",
            value: summary.occupied_rooms,
            change: "70%",
            icon: Hotel,
            color: "text-green-600",
            bgColor: "bg-green-50"
          },
          {
            title: "Revenue Today",
            value: summary.revenue_today,
            change: "+8.5%",
            icon: DollarSign,
            color: "text-purple-600",
            bgColor: "bg-purple-50"
          },
          {
            title: "Total Guests",
            value: summary.total_guests,
            change: "+15%",
            icon: Users,
            color: "text-orange-600",
            bgColor: "bg-orange-50"
          }
        ]);

        setRecentBookings(bookings);
      } catch (err) {
        console.error("Failed to load dashboard:", err);
        toast({
          title: "Loading Failed",
          description: "Failed to load dashboard data. Please refresh the page.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Confirmed":
        return "bg-blue-100 text-blue-800";
      case "Checked In":
        return "bg-green-100 text-green-800";
      case "Pending":
        return "bg-yellow-100 text-yellow-800";
      case "Cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getSourceColor = (source: string) => {
    switch (source) {
      case "Direct":
        return "bg-purple-100 text-purple-800";
      case "Booking.com":
        return "bg-blue-100 text-blue-800";
      case "Expedia":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-6">
      {/* ✅ Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {isLoading ? (
          // Loading skeleton for stats cards
          Array.from({ length: 4 }).map((_, index) => (
            <Card key={index} className="shadow-lg border-blue-100">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="h-4 w-20 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-8 w-8 bg-gray-200 rounded-lg animate-pulse"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 w-16 bg-gray-200 rounded animate-pulse mb-2"></div>
                <div className="h-4 w-24 bg-gray-200 rounded animate-pulse"></div>
              </CardContent>
            </Card>
          ))
        ) : (
          stats.map((stat, index) => (
            <Card key={index} className="shadow-lg border-blue-100 hover:shadow-xl transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  {stat.title}
                </CardTitle>
                <div className={`${stat.bgColor} p-2 rounded-lg`}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-900 mb-2">
                  {stat.value}
                </div>
                <div className="text-sm text-green-600 font-medium">
                  {stat.change} from last month
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* ✅ Recent Bookings Table */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Recent Bookings
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            // Loading state for bookings table
            <div className="space-y-4">
              <div className="flex items-center justify-center py-8">
                <div className="flex items-center gap-2 text-gray-500">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Loading bookings...</span>
                </div>
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Booking ID</TableHead>
                  <TableHead>Guest</TableHead>
                  <TableHead>Room</TableHead>
                  <TableHead>Check-in</TableHead>
                  <TableHead>Check-out</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentBookings.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                      No recent bookings found
                    </TableCell>
                  </TableRow>
                ) : (
                  recentBookings.map((booking) => (
                    <TableRow key={booking.id}>
                      <TableCell className="font-medium">{booking.id}</TableCell>
                      <TableCell>{booking.guest}</TableCell>
                      <TableCell>{booking.room}</TableCell>
                      <TableCell>{booking.checkIn}</TableCell>
                      <TableCell>{booking.checkOut}</TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(booking.status)}>
                          {booking.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getSourceColor(booking.source)}>
                          {booking.source}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{booking.amount}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <BookingUpdateForm 
                            booking={booking} 
                            onBookingUpdate={handleBookingUpdate}
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-800 hover:bg-red-50"
                            onClick={() => handleDelete(booking.id)}
                            disabled={deletingBookingId === booking.id}
                          >
                            {deletingBookingId === booking.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};