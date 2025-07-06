// components/RoomTypeSelector.tsx
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

export const RoomTypeSelector = ({ roomTypes, selectedRoomType, onSelect }) => (
  <div className="space-y-3">
    <Label className="text-sm font-medium">Select Room Type</Label>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {roomTypes.map((room) => (
        <div
          key={room.id}
          className={`p-4 border rounded-lg cursor-pointer transition-all ${
            selectedRoomType === room.id
              ? "border-blue-500 bg-blue-50"
              : "border-gray-200 hover:border-blue-300"
          }`}
          onClick={() => onSelect(room.id)}
        >
          <div className="flex justify-between mb-2">
            <h3 className="font-medium">{room.name}</h3>
            <span className="font-bold text-blue-600">₨{room.price.toLocaleString()}/night</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {room.features.map((feature) => (
              <Badge key={feature} variant="secondary" className="text-xs">{feature}</Badge>
            ))}
          </div>
        </div>
      ))}
    </div>
  </div>
);
