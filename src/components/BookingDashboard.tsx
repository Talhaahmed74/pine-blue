import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar, Users, DollarSign, Hotel, Eye, Edit, Trash2 } from "lucide-react";

export const BookingDashboard = () => {
  const stats = [
    {
      title: "Total Bookings",
      value: "156",
      change: "+12%",
      icon: Calendar,
      color: "text-blue-600",
      bgColor: "bg-blue-50"
    },
    {
      title: "Occupied Rooms",
      value: "42/60",
      change: "70%",
      icon: Hotel,
      color: "text-green-600",
      bgColor: "bg-green-50"
    },
    {
      title: "Revenue Today",
      value: "₨2,458,300",
      change: "+8.5%",
      icon: DollarSign,
      color: "text-purple-600",
      bgColor: "bg-purple-50"
    },
    {
      title: "Total Guests",
      value: "89",
      change: "+15%",
      icon: Users,
      color: "text-orange-600",
      bgColor: "bg-orange-50"
    }
  ];

  const recentBookings = [
    {
      id: "BK001",
      guest: "John Smith",
      room: "Deluxe Room 201",
      checkIn: "2024-01-15",
      checkOut: "2024-01-18",
      status: "Confirmed",
      source: "Direct",
      amount: "₨157,500"
    },
    {
      id: "BK002",
      guest: "Sarah Johnson",
      room: "Suite 305",
      checkIn: "2024-01-16",
      checkOut: "2024-01-20",
      status: "Checked In",
      source: "Booking.com",
      amount: "₨326,800"
    },
    {
      id: "BK003",
      guest: "Mike Chen",
      room: "Standard Room 102",
      checkIn: "2024-01-17",
      checkOut: "2024-01-19",
      status: "Pending",
      source: "Expedia",
      amount: "₨70,000"
    },
    {
      id: "BK004",
      guest: "Emma Davis",
      room: "Penthouse 401",
      checkIn: "2024-01-18",
      checkOut: "2024-01-22",
      status: "Confirmed",
      source: "Direct",
      amount: "₨525,200"
    }
  ];

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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
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
        ))}
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Recent Bookings
          </CardTitle>
        </CardHeader>
        <CardContent>
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
              {recentBookings.map((booking) => (
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
                      <Button variant="ghost" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="text-red-600">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
