import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Hotel, Plus, Edit, Trash2, Wifi, Tv, Car, Coffee, RefreshCw, Settings, Search, X } from "lucide-react";
import { RoomFormDialog, type Room } from "@/components/RoomFormDialog";
import { RoomSettingsForm } from "@/components/RoomSettingsForm";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useRooms } from "@/hooks/useRooms";
import { AlertDialogFooter } from "@/components/ui/alert-dialog";

export const RoomManagement = () => {
  const {
    rooms,
    roomStats,
    isLoading,
    isStatsLoading,
    searchTerm,
    setSearchTerm,
    isSearchMode,
    activeStatusFilter,
    hasMoreRooms,
    isLoadingMore,
    handleLoadMore,
    handleRefresh,
    handleStatusFilter,
    deleteRoom,
  } = useRooms();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState({
    isOpen: false,
    roomNumber: "",
  });

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

  const handleSettingsOpen = () => {
    setIsSettingsOpen(true);
  };

  const handleSettingsClose = () => {
    setIsSettingsOpen(false);
  };

  const handleDeleteConfirm = (roomNumber: string) => {
    setDeleteConfirm({ isOpen: true, roomNumber });
  };

  const handleDelete = () => {
    deleteRoom(deleteConfirm.roomNumber);
    setDeleteConfirm({ isOpen: false, roomNumber: "" });
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

  const statsDisplay = [
    {
      label: "Total Rooms",
      value: roomStats.total,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      borderColor: "border-blue-200",
      hoverBg: "hover:bg-blue-100",
      status: null,
      clickable: false,
    },
    {
      label: "Available",
      value: roomStats.available,
      color: "text-green-600",
      bgColor: "bg-green-50",
      borderColor: "border-green-200",
      hoverBg: "hover:bg-green-100",
      status: "Available",
      clickable: true,
    },
    {
      label: "Occupied",
      value: roomStats.occupied,
      color: "text-red-600",
      bgColor: "bg-red-50",
      borderColor: "border-red-200",
      hoverBg: "hover:bg-red-100",
      status: "Occupied",
      clickable: true,
    },
    {
      label: "Maintenance",
      value: roomStats.maintenance,
      color: "text-yellow-600",
      bgColor: "bg-yellow-50",
      borderColor: "border-yellow-200",
      hoverBg: "hover:bg-yellow-100",
      status: "Maintenance",
      clickable: true,
    },
  ];

  const displayRooms = isSearchMode
    ? rooms.searchResults
    : activeStatusFilter
      ? rooms.rooms.filter((room) => room.status === activeStatusFilter)
      : rooms.rooms;

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-900">Room Management</h2>
        <div className="relative flex-1 sm:flex-none">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Enter Room Number"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 w-full sm:w-64"
            disabled={isLoading}
          />
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={isLoading || isStatsLoading}
            className="flex items-center gap-2 bg-transparent"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading || isStatsLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <div className="flex gap-2">
            <Button onClick={handleAddRoom} className="bg-blue-600 hover:bg-blue-700 flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add New Room
            </Button>
            <Button onClick={handleSettingsOpen} variant="outline" className="flex items-center gap-2 bg-transparent">
              <Settings className="h-4 w-4" />
              Room Settings
            </Button>
          </div>
        </div>
      </div>

      {activeStatusFilter && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <span className="text-blue-800 text-sm font-medium">
              Filtering: {activeStatusFilter} Rooms ({displayRooms.length} found)
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              <X className="h-4 w-4" />
              Clear Filter
            </Button>
          </div>
        </div>
      )}

      {isSearchMode && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <span className="text-blue-800 text-sm">
              {rooms.searchResults.length > 0
                ? `Found ${rooms.searchResults.length} room(s) matching "${searchTerm}"`
                : `No rooms found matching "${searchTerm}"`}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSearchTerm("")}
              className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              <X className="h-4 w-4" />
              Clear Search
            </Button>
          </div>
        </div>
      )}

      <div className="grid w-full gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:auto-cols-fr lg:grid-flow-col">
        {statsDisplay.map((stat, index) => (
          <Card
            key={index}
            className={`shadow-sm w-full transition-all duration-200 ${
              stat.clickable
                ? `cursor-pointer ${stat.hoverBg} ${
                    activeStatusFilter === stat.status
                      ? `${stat.bgColor} border-2 ${stat.borderColor} shadow-md`
                      : "hover:shadow-lg"
                  }`
                : ""
            }`}
            onClick={stat.clickable ? () => handleStatusFilter(stat.status!) : undefined}
          >
            <CardContent className="p-4 text-center">
              <div className={`text-2xl font-bold ${stat.color} flex items-center justify-center gap-2`}>
                {isStatsLoading ? (
                  <div className="animate-pulse bg-gray-200 h-8 w-16 mx-auto rounded"></div>
                ) : (
                  <>
                    {stat.value}
                    {stat.clickable && activeStatusFilter === stat.status && (
                      <Badge variant="secondary" className="text-xs">Active</Badge>
                    )}
                  </>
                )}
              </div>
              <div className="text-sm text-gray-600 mt-1">{stat.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Hotel className="h-5 w-5" />
            Room Inventory
            {activeStatusFilter && <Badge className="ml-2">{activeStatusFilter}</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin mr-2" />
              <span className="text-gray-500">Loading rooms...</span>
            </div>
          ) : displayRooms.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {isSearchMode
                ? `No rooms found matching "${searchTerm}". Try a different search term.`
                : activeStatusFilter
                  ? `No ${activeStatusFilter.toLowerCase()} rooms found.`
                  : "No rooms found. Add your first room to get started."}
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
                  {displayRooms.map((room) => (
                    <TableRow key={room.room_number}>
                      <TableCell className="font-medium">
                        <div>
                          #{room.room_number}
                          <div className="sm:hidden text-xs text-gray-500">{room.room_type}</div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">{room.room_type}</TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(room.status)}>
                          {rooms.statusUpdating[room.room_number] ? (
                            <RefreshCw className="h-4 w-4 animate-spin" />
                          ) : (
                            room.status
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell font-medium">₨{room.price.toLocaleString()}</TableCell>
                      <TableCell className="hidden sm:table-cell">{room.capacity} guests</TableCell>
                      <TableCell className="hidden lg:table-cell">{room.floor}</TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <div className="flex gap-1 flex-wrap">
                          {(room.amenities || []).slice(0, 3).map((amenity: string) => (
                            <Badge key={amenity} variant="secondary" className="text-xs flex items-center gap-1">
                              {getAmenityIcon(amenity)}
                              {amenity}
                            </Badge>
                          ))}
                          {(room.amenities || []).length > 3 && (
                            <Badge variant="secondary" className="text-xs">
                              +{(room.amenities || []).length - 3}
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
                            disabled={rooms.statusUpdating[room.room_number]}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-800"
                            onClick={() => handleDeleteConfirm(room.room_number)}
                            title="Delete room"
                            disabled={rooms.statusUpdating[room.room_number]}
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

      {!isSearchMode && !activeStatusFilter && hasMoreRooms && !isLoading && (
        <div className="flex justify-center mt-4">
          <Button
            onClick={handleLoadMore}
            disabled={isLoadingMore}
            variant="outline"
            className="w-full sm:w-auto px-8 py-2"
          >
            {isLoadingMore ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                Loading More...
              </>
            ) : (
              "Load More Rooms"
            )}
          </Button>
        </div>
      )}

      <RoomFormDialog
        isOpen={isDialogOpen}
        onClose={handleDialogClose}
        editingRoom={editingRoom}
        onRoomAdded={handleRefresh}
        onRoomUpdated={handleRefresh}
      />

      <RoomSettingsForm isOpen={isSettingsOpen} onClose={handleSettingsClose} />

      <AlertDialog
        open={deleteConfirm.isOpen}
        onOpenChange={(open) => setDeleteConfirm({ isOpen: open, roomNumber: "" })}
      >
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
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Delete Room
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};