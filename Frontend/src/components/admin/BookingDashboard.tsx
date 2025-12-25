import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar, Users, DollarSign, Hotel, Eye, Trash2, Loader2, Search, X } from "lucide-react";
import { BookingUpdateForm } from "@/components/UpdateBookingForm";
import { Input } from "@/components/ui/input";
import { useBookings } from "@/hooks/useBookings";
import { useBookingStats } from "@/hooks/useBookingStats";

export const BookingDashboard = () => {
  const {
    bookings,
    deleteBooking,
    updateBooking,
    handleLoadMore,
    isLoading,
    isSearching,
    hasMoreBookings,
    hasMoreSearchResults,
    isSearchMode,
    searchTerm,
    setSearchTerm,
    isLoadingMoreSearch,
  } = useBookings();

  const { stats, isStatsLoading } = useBookingStats();

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Confirmed":
        return "bg-blue-100 text-blue-800";
      case "Checked In":
        return "bg-green-100 text-green-800";
      case "Checked Out":
        return "bg-gray-100 text-gray-800";
      case "Pending":
        return "bg-yellow-100 text-yellow-800";
      case "Cancelled":
        return "bg-red-100 text-red-800";
      case "No Show":
        return "bg-orange-100 text-orange-800";
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

  const handleClearSearch = () => {
    setSearchTerm('');
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {isStatsLoading ? (
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
          [
            {
              title: "Total Bookings",
              value: stats.total_bookings,
              icon: Calendar,
              color: "text-blue-600",
              bgColor: "bg-blue-50",
            },
            {
              title: "Occupied Rooms",
              value: stats.occupied_rooms,
              icon: Hotel,
              color: "text-green-600",
              bgColor: "bg-green-50",
            },
            {
              title: "Revenue Today",
              value: `₨${stats.revenue_today}`,
              icon: DollarSign,
              color: "text-purple-600",
              bgColor: "bg-purple-50",
            },
            {
              title: "Total Guests",
              value: stats.total_guests,
              icon: Users,
              color: "text-orange-600",
              bgColor: "bg-orange-50",
            },
          ].map((stat, index) => (
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
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Recent Bookings Table */}
      <Card className="shadow-lg">
        <CardHeader className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Recent Bookings
          </CardTitle>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4"/>
              <Input
                placeholder="Search by Booking ID (e.g. BK029)"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full"
                disabled={isSearching}
              />
              {isSearching && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                </div>
              )}
            </div>
            {isSearchMode && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearSearch}
                className="flex items-center gap-1 whitespace-nowrap"
              >
                <X className="h-4 w-4" />
                Clear
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              <div className="flex items-center justify-center py-8">
                <div className="flex items-center gap-2 text-gray-500">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Loading bookings...</span>
                </div>
              </div>
            </div>
          ) : (
            <>
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
                  {bookings.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                        {isSearchMode ? "No booking found with that ID" : "No recent bookings found"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    bookings.map((booking) => (
                      <TableRow key={booking.booking_id}>
                        <TableCell className="font-medium">{booking.booking_id}</TableCell>
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
                        <TableCell className="font-medium">₨{booking.amount?.toLocaleString() || '0'}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                            {booking.status !== "Cancelled" && (
                              <>
                                <BookingUpdateForm 
                                  booking={booking} 
                                  onBookingUpdate={updateBooking}
                                />
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-600 hover:text-red-800 hover:bg-red-50"
                                  onClick={() => deleteBooking(booking.booking_id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                            {booking.status === "Cancelled" && (
                              <span className="text-sm text-gray-500 italic px-2">
                                Cancelled booking
                              </span>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              
              {/* Load More Button */}
              {((isSearchMode && hasMoreSearchResults) || (!isSearchMode && hasMoreBookings)) && (
                <div className="flex justify-center mt-6">
                  <Button
                    onClick={handleLoadMore}
                    disabled={isSearchMode ? isLoadingMoreSearch : false}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    {isSearchMode ? isLoadingMoreSearch : false ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      isSearchMode ? 'Load More Search Results' : 'Load More Bookings'
                    )}
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};