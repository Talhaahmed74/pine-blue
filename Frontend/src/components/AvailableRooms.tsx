// components/AvailableRooms.tsx
import { Label } from "@/components/ui/label";
import { AlertCircle, Hotel } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const AvailableRooms = ({ roomType, availableRooms, selectedRoom, onSelectRoom, checkInDate, checkOutDate }) => (
  roomType && (
    <div className="space-y-2">
      <Label className="flex items-center gap-2">
        <Hotel className="h-4 w-4" />
        Available Rooms
      </Label>

      {!checkInDate || !checkOutDate ? (
        <div className="flex items-center gap-2 p-3 bg-yellow-50 text-yellow-700 rounded-md">
          <AlertCircle className="h-4 w-4" />
          <span>Please select both check-in and check-out dates to see available rooms.</span>
        </div>
      ) : availableRooms.length > 0 ? (
        <Select value={selectedRoom} onValueChange={onSelectRoom}>
          <SelectTrigger>
            <SelectValue placeholder="Select a room number" />
          </SelectTrigger>
          <SelectContent>
            {availableRooms.map((room) => (
              <SelectItem key={room} value={room}>
                Room {room}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-md">
          <AlertCircle className="h-4 w-4" />
          <span>No rooms available for this type on selected dates</span>
        </div>
      )}
    </div>
  )
);
