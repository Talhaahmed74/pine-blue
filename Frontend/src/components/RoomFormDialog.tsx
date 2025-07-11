"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import * as React from "react"
import { toast } from "@/components/ui/use-toast"

export interface Room {
  room_number: string
  room_type: string
  status: "Available" | "Occupied" | "Maintenance"
  price: number
  capacity: number
  floor: number
  amenities: string[]
}

interface RoomType {
  id: number
  name: string
  base_price: number
  is_available: boolean
  amenities: string[]
  max_adults: number
  max_children: number
  total_capacity: number
}

const roomFormSchema = z.object({
  room_number: z.string().min(1, "Room number is required"),
  room_type: z.string().min(1, "Room type is required"),
  status: z.enum(["Available", "Occupied", "Maintenance"]),
  floor: z.number().min(1, "Floor must be at least 1"),
})

type RoomFormData = z.infer<typeof roomFormSchema>

interface RoomFormDialogProps {
  isOpen: boolean
  onClose: () => void
  editingRoom?: Room | null
  onRoomAdded: () => void
  onRoomUpdated: () => void
}

export const RoomFormDialog = ({ isOpen, onClose, editingRoom, onRoomAdded, onRoomUpdated }: RoomFormDialogProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([])
  const [selectedRoomType, setSelectedRoomType] = useState<RoomType | null>(null)
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.replace(/\/+$/, "");
  const form = useForm<RoomFormData>({
    resolver: zodResolver(roomFormSchema),
    defaultValues: {
      room_number: "",
      room_type: "",
      status: "Available",
      floor: 1,
    },
  })

  // Fetch available room types - FIXED: Correct API endpoint
  const fetchRoomTypes = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/room-types/list`)
      if (response.ok) {
        const data = await response.json()
        setRoomTypes(data)
      } else {
        console.error("Failed to fetch room types:", response.statusText)
        toast({
          title: "Error",
          description: "Failed to load room types",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Failed to fetch room types:", error)
      toast({
        title: "Error",
        description: "Failed to load room types",
        variant: "destructive",
      })
    }
  }

  useEffect(() => {
    if (isOpen) {
      fetchRoomTypes()
    }
  }, [isOpen])

  // Update form when editingRoom changes
  React.useEffect(() => {
    if (editingRoom) {
      form.reset({
        room_number: editingRoom.room_number,
        room_type: editingRoom.room_type,
        status: editingRoom.status,
        floor: editingRoom.floor,
      })
      // Find and set the selected room type
      const roomType = roomTypes.find((rt) => rt.name === editingRoom.room_type)
      setSelectedRoomType(roomType || null)
    } else {
      form.reset({
        room_number: "",
        room_type: "",
        status: "Available",
        floor: 1,
      })
      setSelectedRoomType(null)
    }
  }, [editingRoom, form, roomTypes])

  // Handle room type selection
  const handleRoomTypeChange = (roomTypeName: string) => {
    const roomType = roomTypes.find((rt) => rt.name === roomTypeName)
    setSelectedRoomType(roomType || null)
    form.setValue("room_type", roomTypeName)
  }

  const addRoom = async (data: RoomFormData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/rooms`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          room_number: data.room_number,
          room_type: data.room_type,
          status: data.status,
          floor: data.floor,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || "Failed to add room")
      }

      toast({
        title: "Success",
        description: "Room added successfully!",
      })
      onRoomAdded()
      handleClose()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to add room. Please try again.",
        variant: "destructive",
      })
    }
  }

  const updateRoom = async (data: RoomFormData) => {
    if (!editingRoom) return

    try {
      const response = await fetch(`${API_BASE_URL}/rooms/${editingRoom.room_number}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: data.status,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        const errorMessage = errorData?.detail || "Failed to update room."
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        })
        return
      }

      toast({
        title: "Success",
        description: "Room updated successfully!",
      })
      onRoomUpdated()
      handleClose()
    } catch (error) {
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      })
    }
  }

  const onSubmit = async (data: RoomFormData) => {
    setIsSubmitting(true)
    try {
      if (editingRoom) {
        await updateRoom(data)
      } else {
        await addRoom(data)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    form.reset()
    setSelectedRoomType(null)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto mx-4 sm:mx-0">
        <DialogHeader>
          <DialogTitle>{editingRoom ? "Edit Room" : "Add New Room"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="room_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Room Number</FormLabel>
                  <FormControl>
                    <Input {...field} disabled={!!editingRoom} placeholder="101" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="room_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Room Type</FormLabel>
                  <Select onValueChange={handleRoomTypeChange} value={field.value} disabled={!!editingRoom}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select room type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {roomTypes.length === 0 ? (
                        <div className="px-2 py-1.5 text-sm text-gray-500">No available room types</div>
                      ) : (
                        roomTypes.map((roomType) => (
                          <SelectItem key={roomType.id} value={roomType.name}>
                            {roomType.name} - ₨{roomType.base_price.toLocaleString()}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Room Type Details Display */}
            {selectedRoomType && (
              <div className="bg-gray-50 p-3 rounded-md space-y-2">
                <h4 className="font-medium text-sm">Room Type Details:</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>Price: ₨{selectedRoomType.base_price.toLocaleString()}</div>
                  <div>Capacity: {selectedRoomType.total_capacity} guests</div>
                  <div className="col-span-2">Amenities: {selectedRoomType.amenities.join(", ")}</div>
                </div>
              </div>
            )}

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Available">Available</SelectItem>
                      {/* Only show Occupied option for editing existing rooms */}
                      {editingRoom && <SelectItem value="Occupied">Occupied</SelectItem>}
                      <SelectItem value="Maintenance">Maintenance</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="floor"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Floor</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      onChange={(e) => field.onChange(Number.parseInt(e.target.value) || 1)}
                      placeholder="1"
                      disabled={!!editingRoom}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex flex-col sm:flex-row justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={handleClose} className="w-full sm:w-auto bg-transparent">
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
                {isSubmitting ? "Saving..." : editingRoom ? "Update Room" : "Add Room"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
