import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Hotel, Plus, Edit, Trash2, Wifi, Tv, Car, Coffee, RefreshCw } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { RoomFormDialog, Room } from "./RoomFormDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const RoomManagement = () => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    roomNumber: string;
  }>({
    isOpen: false,
    roomNumber: "",
  });

  const fetchRooms = async () => {
    try {
      setLoading(true);
      const response = await fetch("http://localhost:8000/rooms");
      if (!response.ok) {
        throw new Error("Failed to fetch rooms");
      }
      const data = await response.json();
      setRooms(data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch rooms from server",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  const handleDeleteConfirm = (roomNumber: string) => {
    setDeleteConfirm({
      isOpen: true,
      roomNumber,
    });
  };

  const handleDelete = async () => {
    try {
      const response = await fetch(`http://localhost:8000/rooms/${deleteConfirm.roomNumber}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete room");
      }

      toast({
        title: "Success",
        description: "Room deleted successfully",
      });
      
      fetchRooms(); // Refresh the list
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete room",
        variant: "destructive",
      });
    } finally {
      setDeleteConfirm({
        isOpen: false,
        roomNumber: "",
      });
    }
  };

  const handleAddRoom = () => {
    setEditingRoom(null);
    setIsDialogOpen(true);
  };

  const handleEditRoom = (room: Room) => {
    setEditingRoom(room);
    setIsDialogOpen(true);
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingRoom(null);
  };

  const handleRoomAdded = () => {
    fetchRooms();
  };

  const handleRoomUpdated = () => {
    fetchRooms();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Available":
        return "bg-green-100 text-green-800";
      case "Occupied":
        return "bg-red-100 text-red-800";
      case "Maintenance":
        return "bg-yellow-100 text-yellow-800";
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

  const statusCounts = rooms.reduce(
    (acc, room) => {
      acc.total++;
      switch (room.status) {
        case "Available":
          acc.available++;
          break;
        case "Occupied":
          acc.occupied++;
          break;
        case "Maintenance":
          acc.maintenance++;
          break;
      }
      return acc;
    },
    { total: 0, available: 0, occupied: 0, maintenance: 0 }
  );

  const roomStats = [
    { label: "Total Rooms", value: statusCounts.total, color: "text-blue-600" },
    { label: "Available", value: statusCounts.available, color: "text-green-600" },
    { label: "Occupied", value: statusCounts.occupied, color: "text-red-600" },
    { label: "Maintenance", value: statusCounts.maintenance, color: "text-yellow-600" },
  ];

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-900">Room Management</h2>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button 
            variant="outline" 
            onClick={fetchRooms}
            disabled={loading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button 
            onClick={handleAddRoom}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add New Room
          </Button>
        </div>
      </div>

      {/* Room Statistics */}
      <div className="grid w-full gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:auto-cols-fr lg:grid-flow-col">
      {roomStats.map((stat, index) => (
        <Card key={index} className="shadow-sm w-full">
          <CardContent className="p-4 text-center">
            <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
            <div className="text-sm text-gray-600">{stat.label}</div>
          </CardContent>
        </Card>
      ))}
    </div>


      {/* Room Inventory Table */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Hotel className="h-5 w-5" />
            Room Inventory
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin mr-2" />
              <span className="text-gray-500">Loading rooms...</span>
            </div>
          ) : rooms.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No rooms found. Add your first room to get started.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[80px]">Room</TableHead>
                    <TableHead className="hidden sm:table-cell">Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden md:table-cell">Price/Night</TableHead>
                    <TableHead className="hidden sm:table-cell">Capacity</TableHead>
                    <TableHead className="hidden lg:table-cell">Floor</TableHead>
                    <TableHead className="hidden lg:table-cell">Amenities</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rooms.map((room) => (
                    <TableRow key={room.room_number}>
                      <TableCell className="font-medium">
                        <div>
                          #{room.room_number}
                          <div className="sm:hidden text-xs text-gray-500">
                            {room.room_type}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">{room.room_type}</TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(room.status)}>
                          {room.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell font-medium">
                        ₨{room.price.toLocaleString()}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">{room.capacity} guests</TableCell>
                      <TableCell className="hidden lg:table-cell">{room.floor}</TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <div className="flex gap-1 flex-wrap">
                          {room.amenities.slice(0, 3).map((amenity) => (
                            <Badge key={amenity} variant="secondary" className="text-xs flex items-center gap-1">
                              {getAmenityIcon(amenity)}
                              {amenity}
                            </Badge>
                          ))}
                          {room.amenities.length > 3 && (
                            <Badge variant="secondary" className="text-xs">
                              +{room.amenities.length - 3}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleEditRoom(room)}
                            title="Edit room"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-red-600 hover:text-red-800"
                            onClick={() => handleDeleteConfirm(room.room_number)}
                            title="Delete room"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Room Form Dialog */}
      <RoomFormDialog
        isOpen={isDialogOpen}
        onClose={handleDialogClose}
        editingRoom={editingRoom}
        onRoomAdded={handleRoomAdded}
        onRoomUpdated={handleRoomUpdated}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirm.isOpen} onOpenChange={(open) => 
        setDeleteConfirm({ isOpen: open, roomNumber: "" })
      }>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete room #{deleteConfirm.roomNumber}
              and remove all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete Room
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};