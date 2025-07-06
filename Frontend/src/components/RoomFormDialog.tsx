import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import * as React from "react";
import { toast } from "@/components/ui/use-toast";

export interface Room {
  room_number: string;
  room_type: string;
  status: "Available" | "Occupied" | "Maintenance";
  price: number;
  capacity: number;
  floor: number;
  amenities: string[];
}

const roomTypeOptions = ["Standard", "Deluxe", "Suite", "Penthouse"] as const;

const roomFormSchema = z.object({
  room_number: z.string().min(1, "Room number is required"),
  room_type: z.string().min(1, "Room type is required"),
  status: z.enum(["Available", "Occupied", "Maintenance"]),
  price: z.number().min(1, "Price must be greater than 0"),
  capacity: z.number().min(1, "Capacity must be at least 1"),
  floor: z.number().min(1, "Floor must be at least 1"),
  amenities: z.array(z.string()).min(1, "At least one amenity is required"),
});

type RoomFormData = z.infer<typeof roomFormSchema>;

const amenityOptions = ["WiFi", "TV", "AC", "Balcony", "Jacuzzi", "Kitchen"];

interface RoomFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  editingRoom?: Room | null;
  onRoomAdded: () => void;
  onRoomUpdated: () => void;
}

export const RoomFormDialog = ({ 
  isOpen, 
  onClose, 
  editingRoom, 
  onRoomAdded, 
  onRoomUpdated 
}: RoomFormDialogProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<RoomFormData>({
    resolver: zodResolver(roomFormSchema),
    defaultValues: {
      room_number: "",
      room_type: "Standard",
      status: "Available",
      price: 0,
      capacity: 1,
      floor: 1,
      amenities: [],
    },
  });

  // Update form when editingRoom changes
  React.useEffect(() => {
    if (editingRoom) {
      form.reset({
        room_number: editingRoom.room_number,
        room_type: editingRoom.room_type,
        status: editingRoom.status,
        price: editingRoom.price,
        capacity: editingRoom.capacity,
        floor: editingRoom.floor,
        amenities: editingRoom.amenities,
      });
    } else {
      form.reset({
        room_number: "",
        room_type: "Standard",
        status: "Available",
        price: 0,
        capacity: 1,
        floor: 1,
        amenities: [],
      });
    }
  }, [editingRoom, form]);

  const addRoom = async (data: RoomFormData) => {
    try {
      const response = await fetch("http://localhost:8000/rooms", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          room_number: data.room_number,
          type: data.room_type,
          status: data.status,
          price: data.price,
          capacity: data.capacity,
          floor: data.floor,
          amenities: data.amenities,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to add room");
      }

      toast({
        title: "Success",
        description: "Room added successfully!",
      });
      
      onRoomAdded();
      handleClose();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add room. Please try again.",
        variant: "destructive",
      });
    }
  };

  const updateRoom = async (data: RoomFormData) => {
    if (!editingRoom) return;

    try {
      const response = await fetch(`http://localhost:8000/rooms/${editingRoom.room_number}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          room_number: data.room_number,
          type: data.room_type,
          status: data.status,
          price: data.price,
          capacity: data.capacity,
          floor: data.floor,
          amenities: data.amenities,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update room");
      }

      toast({
        title: "Success",
        description: "Room updated successfully!",
      });
      
      onRoomUpdated();
      handleClose();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update room. Please try again.",
        variant: "destructive",
      });
    }
  };

  const onSubmit = async (data: RoomFormData) => {
    setIsSubmitting(true);
    try {
      if (editingRoom) {
        await updateRoom(data);
      } else {
        await addRoom(data);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    form.reset();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto mx-4 sm:mx-0">
        <DialogHeader>
          <DialogTitle>
            {editingRoom ? "Edit Room" : "Add New Room"}
          </DialogTitle>
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
                  <FormLabel>Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select room type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {roomTypeOptions.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                      <SelectItem value="Occupied">Occupied</SelectItem>
                      <SelectItem value="Maintenance">Maintenance</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price (₨)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        {...field} 
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        placeholder="35000" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="capacity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Capacity</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        {...field} 
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                        placeholder="2" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

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
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                      placeholder="1" 
                    />
                  </FormControl>
                  <FormMessage />
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
                            <FormItem
                              key={amenity}
                              className="flex flex-row items-start space-x-3 space-y-0"
                            >
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(amenity)}
                                  onCheckedChange={(checked) => {
                                    return checked
                                      ? field.onChange([...field.value, amenity])
                                      : field.onChange(
                                          field.value?.filter(
                                            (value) => value !== amenity
                                          )
                                        )
                                  }}
                                />
                              </FormControl>
                              <FormLabel className="text-sm font-normal">
                                {amenity}
                              </FormLabel>
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
              <Button type="button" variant="outline" onClick={handleClose} className="w-full sm:w-auto">
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
  );
};