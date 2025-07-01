import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Hotel, Plus, Edit, Trash2, Wifi, Tv, Car, Coffee } from "lucide-react";

export const RoomManagement = () => {
  const rooms = [
    {
      id: "101",
      type: "Standard",
      status: "Available",
      price: 35000,
      capacity: 2,
      amenities: ["WiFi", "TV", "AC"],
      floor: 1
    },
    {
      id: "201",
      type: "Deluxe",
      status: "Occupied",
      price: 52500,
      capacity: 2,
      amenities: ["WiFi", "TV", "AC", "Balcony"],
      floor: 2
    },
    {
      id: "301",
      type: "Suite",
      status: "Maintenance",
      price: 81700,
      capacity: 4,
      amenities: ["WiFi", "TV", "AC", "Balcony", "Jacuzzi"],
      floor: 3
    },
    {
      id: "401",
      type: "Penthouse",
      status: "Available",
      price: 131300,
      capacity: 6,
      amenities: ["WiFi", "TV", "AC", "Balcony", "Jacuzzi", "Kitchen"],
      floor: 4
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Available":
        return "bg-green-100 text-green-800";
      case "Occupied":
        return "bg-red-100 text-red-800";
      case "Maintenance":
        return "bg-yellow-100 text-yellow-800";
      case "Cleaning":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getAmenityIcon = (amenity: string) => {
    switch (amenity) {
      case "WiFi":
        return <Wifi className="h-3 w-3" />;
      case "TV":
        return <Tv className="h-3 w-3" />;
      case "AC":
        return <Car className="h-3 w-3" />;
      case "Kitchen":
        return <Coffee className="h-3 w-3" />;
      default:
        return null;
    }
  };

  const roomStats = [
    { label: "Total Rooms", value: "60", color: "text-blue-600" },
    { label: "Available", value: "18", color: "text-green-600" },
    { label: "Occupied", value: "35", color: "text-red-600" },
    { label: "Maintenance", value: "7", color: "text-yellow-600" }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Room Management</h2>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-2" />
          Add New Room
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {roomStats.map((stat, index) => (
          <Card key={index} className="shadow-sm">
            <CardContent className="p-4 text-center">
              <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
              <div className="text-sm text-gray-600">{stat.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Hotel className="h-5 w-5" />
            Room Inventory
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Room</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Price/Night</TableHead>
                <TableHead>Capacity</TableHead>
                <TableHead>Floor</TableHead>
                <TableHead>Amenities</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rooms.map((room) => (
                <TableRow key={room.id}>
                  <TableCell className="font-medium">#{room.id}</TableCell>
                  <TableCell>{room.type}</TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(room.status)}>
                      {room.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">₨{room.price.toLocaleString()}</TableCell>
                  <TableCell>{room.capacity} guests</TableCell>
                  <TableCell>{room.floor}</TableCell>
                  <TableCell>
                    <div className="flex gap-1 flex-wrap">
                      {room.amenities.map((amenity) => (
                        <Badge key={amenity} variant="secondary" className="text-xs flex items-center gap-1">
                          {getAmenityIcon(amenity)}
                          {amenity}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
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
