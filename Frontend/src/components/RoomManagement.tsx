"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Hotel, Plus, Edit, Trash2, Wifi, Tv, Car, Coffee, RefreshCw, Settings, Search } from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import { RoomFormDialog, type Room } from "./RoomFormDialog"
import { Input } from "@/components/ui/input"
import { RoomSettingsForm } from "./RoomSettingsForm"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

// Type for room statistics
interface RoomStats {
  total: number
  available: number
  occupied: number
  maintenance: number
}

export const RoomManagement = () => {
  const limit = 8
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.replace(/\/+$/, "")
  const [editingRoom, setEditingRoom] = useState<Room | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [isSearching, setIsSearching] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [hasMoreRooms, setHasMoreRooms] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [totalCount, setTotalCount] = useState(0)
  const [isSearchMode, setIsSearchMode] = useState(false)
  const [searchResults, setSearchResults] = useState<Room[]>([])
  
  // NEW: Separate state for room statistics
  const [roomStats, setRoomStats] = useState<RoomStats>({
    total: 0,
    available: 0,
    occupied: 0,
    maintenance: 0
  })
  const [statsLoading, setStatsLoading] = useState(true)
  
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean
    roomNumber: string
  }>({
    isOpen: false,
    roomNumber: "",
  })

  // Get the rooms to display (either search results or paginated rooms)
  const displayRooms = isSearchMode ? searchResults : rooms

  // NEW: Function to fetch room statistics
  const fetchRoomStats = async () => {
    try {
      setStatsLoading(true)
      const response = await fetch(`${API_BASE_URL}/rooms/stats`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch room statistics')
      }
      
      const stats = await response.json()
      setRoomStats(stats)
    } catch (error) {
      console.error("Failed to fetch room stats:", error)
      toast({
        title: "Warning",
        description: "Failed to load room statistics",
        variant: "destructive",
      })
      // Set fallback stats
      setRoomStats({
        total: 0,
        available: 0,
        occupied: 0,
        maintenance: 0
      })
    } finally {
      setStatsLoading(false)
    }
  }

  // Debouncing Search Functionality
  useEffect(() => {
    const trimmedTerm = searchTerm.trim()
  
    // If search input is empty, exit search mode and show paginated results
    if (trimmedTerm.length < 3) {
      setIsSearchMode(false)
      setSearchResults([])
      return
    }
  
    setIsSearching(true)
  
    const debounceTimer = setTimeout(async () => {
      try {
        const searchResult = await searchRoomsAPI(trimmedTerm)
        setSearchResults(searchResult)
        setIsSearchMode(true)
      } catch (error) {
        console.error("Search failed:", error)
        setSearchResults([])
        setIsSearchMode(true)
        toast({
          title: "Error",
          description: "Failed to search rooms. Please try again.",
          variant: "destructive",
        })
      } finally {
        setIsSearching(false)
      }
    }, 500)
  
    // Cleanup on re-run or unmount
    return () => clearTimeout(debounceTimer)
  }, [searchTerm])

  // Fetch rooms with pagination
  const fetchPaginatedRooms = async(page: number) => {
    const offset = (page - 1) * limit
    const res = await fetch(`${API_BASE_URL}/rooms?limit=${limit}&offset=${offset}`)
    if(!res.ok) throw new Error('Failed to fetch rooms')
    return await res.json()
  }

  // Load More rooms Functionality
  const handleLoadMore = async() => {
    if (isLoadingMore || !hasMoreRooms || isSearchMode) return

    setIsLoadingMore(true)
    try {
      const nextPage = currentPage + 1
      const data = await fetchPaginatedRooms(nextPage)
      
      // Safely handle the response
      const newRooms = data?.rooms || []
      const newTotalCount = data?.total_count || 0
      
      setRooms(prev => [...prev, ...newRooms])
      setCurrentPage(nextPage)
      setHasMoreRooms(rooms.length + newRooms.length < newTotalCount)
      
      toast({
        title: "Success",
        description: `Loaded ${newRooms.length} more rooms`, 
      })
    } catch (error) {
      console.error("Load more failed:", error)
      toast({
        title: "Error",
        description: "Failed to load more rooms. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsLoadingMore(false)
    }
  }
  
  const fetchRooms = async () => {
    try {
      setLoading(true)
      const response = await fetchPaginatedRooms(1)
      
      // Safely handle the response
      const roomsData = response?.rooms || []
      const totalCountData = response?.total_count || 0
      
      setRooms(roomsData)
      setCurrentPage(1)
      setTotalCount(totalCountData)
      setHasMoreRooms(roomsData.length < totalCountData)
      
      // Clear search when refreshing
      setSearchTerm("")
      setSearchResults([])
      setIsSearchMode(false)
    } catch (error) {
      console.error("Fetch rooms error:", error)
      // Set empty state on error
      setRooms([])
      setTotalCount(0)
      setHasMoreRooms(false)
      toast({
        title: "Error",
        description: "Failed to fetch rooms from server",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // UPDATED: Load both rooms and stats on component mount
  useEffect(() => {
    const loadInitialData = async () => {
      await Promise.all([
        fetchRooms(),
        fetchRoomStats()
      ])
    }
    
    loadInitialData()
  }, [])
  
  const handleDeleteConfirm = (roomNumber: string) => {
    setDeleteConfirm({
      isOpen: true,
      roomNumber,
    })
  }

  const handleDelete = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/rooms/${deleteConfirm.roomNumber}`, {
        method: "DELETE",
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.detail || "Failed to delete room")
      }
      
      toast({
        title: "Success",
        description: "Room deleted successfully",
      })
      
      // UPDATED: Refresh both room list and stats
      await Promise.all([
        fetchRooms(),
        fetchRoomStats()
      ])
    } catch (error) {
      console.error("Delete error:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete room",
        variant: "destructive",
      })
    } finally {
      setDeleteConfirm({
        isOpen: false,
        roomNumber: "",
      })
    }
  }

  const handleAddRoom = () => {
    setEditingRoom(null)
    setIsDialogOpen(true)
  }

  const handleEditRoom = (room: Room) => {
    setEditingRoom(room)
    setIsDialogOpen(true)
  }

  const handleDialogClose = () => {
    setIsDialogOpen(false)
    setEditingRoom(null)
  }

  // UPDATED: Refresh both rooms and stats when room is added/updated
  const handleRoomAdded = async () => {
    await Promise.all([
      fetchRooms(),
      fetchRoomStats()
    ])
  }

  const handleRoomUpdated = async () => {
    await Promise.all([
      fetchRooms(),
      fetchRoomStats()
    ])
  }

  const handleSettingsOpen = () => {
    setIsSettingsOpen(true)
  }

  const handleSettingsClose = () => {
    setIsSettingsOpen(false)
  }

  // UPDATED: Refresh both rooms and stats when refresh button is clicked
  const handleRefresh = async () => {
    await Promise.all([
      fetchRooms(),
      fetchRoomStats()
    ])
  }

  // Fixed API function for searching rooms
  const searchRoomsAPI = async (searchTerm: string): Promise<Room[]> => {
    try {
      const res = await fetch(`${API_BASE_URL}/rooms/${encodeURIComponent(searchTerm.trim())}`) 
  
      if (!res.ok) {
        if (res.status === 404) {
          return [] // Room not found, return empty array
        }
        throw new Error("Search request failed")
      }
  
      const room = await res.json()
      return [room] // Return as array to keep it Room[]
    } catch (error) {
      console.error("Search failed:", error)
      throw error // Re-throw to handle in the calling function
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Available":
        return "bg-green-100 text-green-800"
      case "Occupied":
        return "bg-red-100 text-red-800"
      case "Maintenance":
        return "bg-yellow-100 text-yellow-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getAmenityIcon = (amenity: string) => {
    switch (amenity) {
      case "WiFi":
        return <Wifi className="h-3 w-3" />
      case "TV":
        return <Tv className="h-3 w-3" />
      case "AC":
        return <Car className="h-3 w-3" />
      case "Kitchen":
        return <Coffee className="h-3 w-3" />
      default:
        return null
    }
  }

  // UPDATED: Use the dedicated room stats instead of calculating from paginated data
  const statsDisplay = [
    {
      label: "Total Rooms",
      value: roomStats.total,
      color: "text-blue-600"
    },
    {
      label: "Available",
      value: roomStats.available,
      color: "text-green-600"
    },
    {
      label: "Occupied",
      value: roomStats.occupied,
      color: "text-red-600"
    },
    {
      label: "Maintenance",
      value: roomStats.maintenance,
      color: "text-yellow-600"
    }
  ]

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
            disabled={isSearching}
          />

          {isSearching && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={loading || statsLoading}
            className="flex items-center gap-2 bg-transparent"
          >
            <RefreshCw className={`h-4 w-4 ${(loading || statsLoading) ? "animate-spin" : ""}`} />
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

      {/* Search Status Indicator */}
      {isSearchMode && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <span className="text-blue-800 text-sm">
              {searchResults.length > 0 
                ? `Found ${searchResults.length} room(s) matching "${searchTerm}"`
                : `No rooms found matching "${searchTerm}"`
              }
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchTerm("")
                setIsSearchMode(false)
                setSearchResults([])
              }}
              className="text-blue-600 hover:text-blue-800"
            >
              Clear Search
            </Button>
          </div>
        </div>
      )}

      {/* Room Statistics - UPDATED to use dedicated stats */}
      <div className="grid w-full gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:auto-cols-fr lg:grid-flow-col">
        {statsDisplay.map((stat, index) => (
          <Card key={index} className="shadow-sm w-full">
            <CardContent className="p-4 text-center">
              <div className={`text-2xl font-bold ${stat.color}`}>
                {statsLoading ? (
                  <div className="animate-pulse bg-gray-200 h-8 w-16 mx-auto rounded"></div>
                ) : (
                  stat.value
                )}
              </div>
              <div className="text-sm text-gray-600">
                {stat.label}
              </div>
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
          ) : (displayRooms || []).length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {isSearchMode 
                ? `No rooms found matching "${searchTerm}". Try a different search term.`
                : "No rooms found. Add your first room to get started."
              }
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
                  {(displayRooms || []).map((room) => (
                    <TableRow key={room.room_number}>
                      <TableCell className="font-medium">
                        <div>
                          #{room.room_number}
                          <div className="sm:hidden text-xs text-gray-500">{room.room_type}</div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">{room.room_type}</TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(room.status)}>{room.status}</Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell font-medium">₨{room.price.toLocaleString()}</TableCell>
                      <TableCell className="hidden sm:table-cell">{room.capacity} guests</TableCell>
                      <TableCell className="hidden lg:table-cell">{room.floor}</TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <div className="flex gap-1 flex-wrap">
                          {(room.amenities || []).slice(0, 3).map((amenity) => (
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
                          <Button variant="ghost" size="sm" onClick={() => handleEditRoom(room)} title="Edit room">
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

      {/* Load More Button - Only show when not in search mode */}
      {!isSearchMode && hasMoreRooms && !loading && (
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

      {/* Room Form Dialog */}
      <RoomFormDialog
        isOpen={isDialogOpen}
        onClose={handleDialogClose}
        editingRoom={editingRoom}
        onRoomAdded={handleRoomAdded}
        onRoomUpdated={handleRoomUpdated}
      />

      {/* Room Settings Dialog */}
      <RoomSettingsForm isOpen={isSettingsOpen} onClose={handleSettingsClose} />

      {/* Delete Confirmation Dialog */}
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
  )
}