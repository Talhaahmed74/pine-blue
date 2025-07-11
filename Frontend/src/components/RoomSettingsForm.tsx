"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { toast } from "@/components/ui/use-toast"
import { Plus, Edit, Trash2, RefreshCw } from "lucide-react"
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

interface RoomType {
  id: number
  name: string
  base_price: number
  is_available: boolean
  amenities: string[]
  max_adults: number
  max_children: number
  total_capacity: number
  created_at: string
  updated_at?: string
}

const roomTypeFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  base_price: z.number().min(1, "Price must be greater than 0"),
  is_available: z.boolean(),
  amenities: z.array(z.string()).min(1, "At least one amenity is required"),
  max_adults: z.number().min(1, "Max adults must be at least 1"),
  max_children: z.number().min(0, "Max children must be 0 or greater"),
})

type RoomTypeFormData = z.infer<typeof roomTypeFormSchema>

const amenityOptions = ["WiFi", "TV", "AC", "Balcony", "Jacuzzi", "Kitchen"]

interface RoomSettingsFormProps {
  isOpen: boolean
  onClose: () => void
}

export const RoomSettingsForm = ({ isOpen, onClose }: RoomSettingsFormProps) => {
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([])
  const [loading, setLoading] = useState(false)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingRoomType, setEditingRoomType] = useState<RoomType | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean
    roomTypeId: number
    roomTypeName: string
  }>({
    isOpen: false,
    roomTypeId: 0,
    roomTypeName: "",
  })

  const form = useForm<RoomTypeFormData>({
    resolver: zodResolver(roomTypeFormSchema),
    defaultValues: {
      name: "",
      base_price: 0,
      is_available: true,
      amenities: [],
      max_adults: 1,
      max_children: 0,
    },
  })

  const fetchRoomTypes = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${API_BASE_URL}/room-types`)
      if (response.ok) {
        const data = await response.json()
        setRoomTypes(data)
      } else {
        throw new Error("Failed to fetch room types")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch room types",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      fetchRoomTypes()
    }
  }, [isOpen])

  useEffect(() => {
    if (editingRoomType) {
      form.reset({
        name: editingRoomType.name,
        base_price: editingRoomType.base_price,
        is_available: editingRoomType.is_available,
        amenities: editingRoomType.amenities,
        max_adults: editingRoomType.max_adults,
        max_children: editingRoomType.max_children,
      })
    } else {
      form.reset({
        name: "",
        base_price: 0,
        is_available: true,
        amenities: [],
        max_adults: 1,
        max_children: 0,
      })
    }
  }, [editingRoomType, form])

  const handleAddRoomType = () => {
    setEditingRoomType(null)
    setIsFormOpen(true)
  }

  const handleEditRoomType = (roomType: RoomType) => {
    setEditingRoomType(roomType)
    setIsFormOpen(true)
  }

  const handleFormClose = () => {
    setIsFormOpen(false)
    setEditingRoomType(null)
    form.reset()
  }

  const handleDeleteConfirm = (roomType: RoomType) => {
    setDeleteConfirm({
      isOpen: true,
      roomTypeId: roomType.id,
      roomTypeName: roomType.name,
    })
  }

  const handleDelete = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/room-types/${deleteConfirm.roomTypeId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || "Failed to delete room type")
      }

      toast({
        title: "Success",
        description: "Room type deleted successfully",
      })

      fetchRoomTypes()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete room type",
        variant: "destructive",
      })
    } finally {
      setDeleteConfirm({
        isOpen: false,
        roomTypeId: 0,
        roomTypeName: "",
      })
    }
  }

  const onSubmit = async (data: RoomTypeFormData) => {
    setIsSubmitting(true)
    try {
      const url = editingRoomType
        ? `${API_BASE_URL}/room-types/${editingRoomType.id}`
        : "${API_BASE_URL}/room-types"

      const method = editingRoomType ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || `Failed to ${editingRoomType ? "update" : "create"} room type`)
      }

      toast({
        title: "Success",
        description: `Room type ${editingRoomType ? "updated" : "created"} successfully!`,
      })

      fetchRoomTypes()
      handleFormClose()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const seedRoomTypes = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/room-types/seed`, {
        method: "POST",
      })

      if (!response.ok) {
        throw new Error("Failed to seed room types")
      }

      const result = await response.json()
      toast({
        title: "Success",
        description: result.message,
      })

      fetchRoomTypes()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to seed room types",
        variant: "destructive",
      })
    }
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto mx-4 sm:mx-0">
          <DialogHeader>
            <DialogTitle>Room Type Settings</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex gap-2">
                <Button onClick={handleAddRoomType} className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Add Room Type
                </Button>
                <Button variant="outline" onClick={seedRoomTypes}>
                  Seed Default Types
                </Button>
              </div>
              <Button
                variant="outline"
                onClick={fetchRoomTypes}
                disabled={loading}
                className="flex items-center gap-2 bg-transparent"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Room Types</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="h-6 w-6 animate-spin mr-2" />
                    <span className="text-gray-500">Loading room types...</span>
                  </div>
                ) : roomTypes.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No room types found. Add your first room type to get started.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Price</TableHead>
                          <TableHead>Capacity</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="hidden lg:table-cell">Amenities</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {roomTypes.map((roomType) => (
                          <TableRow key={roomType.id}>
                            <TableCell className="font-medium">{roomType.name}</TableCell>
                            <TableCell>₨{roomType.base_price.toLocaleString()}</TableCell>
                            <TableCell>
                              {roomType.max_adults}A + {roomType.max_children}C
                              <div className="text-xs text-gray-500">({roomType.total_capacity} total)</div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={roomType.is_available ? "default" : "secondary"}>
                                {roomType.is_available ? "Available" : "Disabled"}
                              </Badge>
                            </TableCell>
                            <TableCell className="hidden lg:table-cell">
                              <div className="flex gap-1 flex-wrap">
                                {roomType.amenities.slice(0, 3).map((amenity) => (
                                  <Badge key={amenity} variant="outline" className="text-xs">
                                    {amenity}
                                  </Badge>
                                ))}
                                {roomType.amenities.length > 3 && (
                                  <Badge variant="outline" className="text-xs">
                                    +{roomType.amenities.length - 3}
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditRoomType(roomType)}
                                  title="Edit room type"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-600 hover:text-red-800"
                                  onClick={() => handleDeleteConfirm(roomType)}
                                  title="Delete room type"
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
          </div>
        </DialogContent>
      </Dialog>

      {/* Room Type Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={handleFormClose}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto mx-4 sm:mx-0">
          <DialogHeader>
            <DialogTitle>{editingRoomType ? "Edit Room Type" : "Add New Room Type"}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Standard Double" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="base_price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Base Price (₨)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        onChange={(e) => field.onChange(Number.parseFloat(e.target.value) || 0)}
                        placeholder="4500"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="max_adults"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Max Adults</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) => field.onChange(Number.parseInt(e.target.value) || 1)}
                          placeholder="2"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="max_children"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Max Children</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) => field.onChange(Number.parseInt(e.target.value) || 0)}
                          placeholder="1"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="is_available"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Available for booking</FormLabel>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="amenities"
                render={() => (
                  <FormItem>
                    <FormLabel>Amenities</FormLabel>
                    <div className="grid grid-cols-2 gap-2">
                      {amenityOptions.map((amenity) => (
                        <FormField
                          key={amenity}
                          control={form.control}
                          name="amenities"
                          render={({ field }) => {
                            return (
                              <FormItem key={amenity} className="flex flex-row items-start space-x-3 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(amenity)}
                                    onCheckedChange={(checked) => {
                                      return checked
                                        ? field.onChange([...field.value, amenity])
                                        : field.onChange(field.value?.filter((value) => value !== amenity))
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="text-sm font-normal">{amenity}</FormLabel>
                              </FormItem>
                            )
                          }}
                        />
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex flex-col sm:flex-row justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleFormClose}
                  className="w-full sm:w-auto bg-transparent"
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
                  {isSubmitting ? "Saving..." : editingRoomType ? "Update Room Type" : "Add Room Type"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={deleteConfirm.isOpen}
        onOpenChange={(open) => setDeleteConfirm({ isOpen: open, roomTypeId: 0, roomTypeName: "" })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the room type "{deleteConfirm.roomTypeName}"
              and remove all associated data. You cannot delete a room type if there are existing rooms using it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Delete Room Type
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
