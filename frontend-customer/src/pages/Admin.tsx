import { useState } from "react";
import Header from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Hotel, Users, Calendar, Settings, Edit, Trash2 } from "lucide-react";
import { useRooms, useBookings, useStats } from "@/hooks/useSupabaseData";
import { supabase } from "@/integrations/supabase/client";
import { toast } from 'sonner';
import { format } from "date-fns";
import AddRoomDialog from "@/components/AddRoomDialog";
import PaymentSettings from "@/components/PaymentSettings";
import DummyDataButton from "@/components/DummyDataButton";
import { Database } from '@/integrations/supabase/types';

type BookingStatus = Database['public']['Enums']['booking_status'];
type RoomStatus = Database['public']['Enums']['room_status'];

const Admin = () => {
  const [activeTab, setActiveTab] = useState("overview");
  
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useStats();
  const { data: bookings, isLoading: bookingsLoading, refetch: refetchBookings } = useBookings();
  const { data: rooms, isLoading: roomsLoading, refetch: refetchRooms } = useRooms();

  const getStatusColor = (status: BookingStatus | RoomStatus) => {
    switch (status) {
      case "confirmed":
      case "available":
      case "completed":
        return "default";
      case "pending":
      case "occupied":
        return "secondary";
      case "cancelled":
      case "maintenance":
        return "destructive";
      default:
        return "default";
    }
  };

  const handleRoomAdded = () => {
    refetchRooms();
    refetchStats();
  };

  const handleDeleteRoom = async (roomId: string) => {
    if (!confirm('Are you sure you want to delete this room?')) return;
    
    try {
      const { error } = await supabase.from('rooms').delete().eq('id', roomId);
      if (error) throw error;
      
      toast.success('Room deleted successfully');
      refetchRooms();
      refetchStats();
    } catch (error: any) {
      toast.error('Failed to delete room: ' + error.message);
    }
  };

  const handleUpdateBookingStatus = async (bookingId: string, newStatus: BookingStatus) => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: newStatus })
        .eq('id', bookingId);
      
      if (error) throw error;
      
      toast.success('Booking status updated');
      refetchBookings();
      refetchStats();
    } catch (error: any) {
      toast.error('Failed to update booking: ' + error.message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
          <p className="text-xl text-gray-600">Manage your hotel operations</p>
        </div>

        <div className="flex space-x-4 mb-8 overflow-x-auto">
          <Button 
            variant={activeTab === "overview" ? "default" : "outline"}
            onClick={() => setActiveTab("overview")}
            className="flex items-center space-x-2 whitespace-nowrap"
          >
            <Hotel className="h-4 w-4" />
            <span>Overview</span>
          </Button>
          <Button 
            variant={activeTab === "bookings" ? "default" : "outline"}
            onClick={() => setActiveTab("bookings")}
            className="flex items-center space-x-2 whitespace-nowrap"
          >
            <Calendar className="h-4 w-4" />
            <span>Bookings</span>
          </Button>
          <Button 
            variant={activeTab === "rooms" ? "default" : "outline"}
            onClick={() => setActiveTab("rooms")}
            className="flex items-center space-x-2 whitespace-nowrap"
          >
            <Users className="h-4 w-4" />
            <span>Rooms</span>
          </Button>
          <Button 
            variant={activeTab === "payments" ? "default" : "outline"}
            onClick={() => setActiveTab("payments")}
            className="flex items-center space-x-2 whitespace-nowrap"
          >
            <Settings className="h-4 w-4" />
            <span>Payment Settings</span>
          </Button>
        </div>

        {activeTab === "overview" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Rooms</CardTitle>
                <Hotel className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {statsLoading ? "Loading..." : stats?.totalRooms || 0}
                </div>
                <p className="text-xs text-muted-foreground">Active rooms in system</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Occupied Rooms</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {statsLoading ? "Loading..." : stats?.occupiedRooms || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  {stats?.totalRooms ? Math.round(((stats?.occupiedRooms || 0) / stats.totalRooms) * 100) : 0}% occupancy rate
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Today's Revenue</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  Rs{statsLoading ? "Loading..." : (stats?.todayRevenue || 0).toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">Revenue from completed payments</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Bookings</CardTitle>
                <Settings className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {statsLoading ? "Loading..." : stats?.pendingBookings || 0}
                </div>
                <p className="text-xs text-muted-foreground">Requires attention</p>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "bookings" && (
          <Card>
            <CardHeader>
              <CardTitle>Recent Bookings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {bookingsLoading ? (
                  <div>Loading bookings...</div>
                ) : bookings && bookings.length > 0 ? (
                  bookings.map((booking: any) => (
                    <div key={booking.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <h3 className="font-semibold">{booking.guest_name}</h3>
                        <p className="text-gray-600">{booking.rooms?.name}</p>
                        <p className="text-sm text-gray-500">
                          {format(new Date(booking.check_in), 'MMM dd, yyyy')} to {format(new Date(booking.check_out), 'MMM dd, yyyy')}
                        </p>
                        <p className="text-sm font-medium">Rs{Number(booking.total_amount).toLocaleString()}</p>
                        {booking.guest_email && <p className="text-xs text-gray-500">{booking.guest_email}</p>}
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant={getStatusColor(booking.status)}>
                          {booking.status}
                        </Badge>
                        {booking.status === 'pending' && (
                          <Button 
                            size="sm" 
                            onClick={() => handleUpdateBookingStatus(booking.id, 'confirmed')}
                          >
                            Confirm
                          </Button>
                        )}
                        {booking.status === 'confirmed' && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleUpdateBookingStatus(booking.id, 'completed')}
                          >
                            Complete
                          </Button>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">No bookings found</div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === "rooms" && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Room Management</CardTitle>
              <div className="flex gap-2">
                <DummyDataButton onDataAdded={handleRoomAdded} />
                <AddRoomDialog onRoomAdded={handleRoomAdded} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {roomsLoading ? (
                  <div>Loading rooms...</div>
                ) : rooms && rooms.length > 0 ? (
                  rooms.map((room: any) => (
                    <div key={room.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <img 
                          src={room.image_url}
                          alt={room.name}
                          className="w-16 h-16 object-cover rounded-lg"
                        />
                        <div>
                          <h3 className="font-semibold">{room.name}</h3>
                          <p className="text-gray-600">Rs{Number(room.price).toLocaleString()}/night</p>
                          <p className="text-sm text-gray-500">Capacity: {room.capacity} guests</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {room.amenities?.slice(0, 3).map((amenity: string) => (
                              <Badge key={amenity} variant="outline" className="text-xs">
                                {amenity}
                              </Badge>
                            ))}
                            {room.amenities?.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{room.amenities.length - 3} more
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant={getStatusColor(room.status)}>
                          {room.status}
                        </Badge>
                        <Button size="sm" variant="outline">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="destructive"
                          onClick={() => handleDeleteRoom(room.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500 mb-4">No rooms found</p>
                    <div className="flex justify-center gap-2">
                      <DummyDataButton onDataAdded={handleRoomAdded} />
                      <AddRoomDialog onRoomAdded={handleRoomAdded} />
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === "payments" && <PaymentSettings />}
      </div>
    </div>
  );
};

export default Admin;
