
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Calendar, Users, Hotel, CreditCard } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export const HotelBookingForm = () => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    checkIn: "",
    checkOut: "",
    guests: 1,
    roomType: "",
    firstName: "",
    lastName: "",
    email: "",
    phone: ""
  });

  const roomTypes = [
    { id: "standard", name: "Standard Room", price: 35000, features: ["WiFi", "TV", "AC"] },
    { id: "deluxe", name: "Deluxe Room", price: 52500, features: ["WiFi", "TV", "AC", "Balcony"] },
    { id: "suite", name: "Suite", price: 81700, features: ["WiFi", "TV", "AC", "Balcony", "Jacuzzi"] },
    { id: "penthouse", name: "Penthouse", price: 131300, features: ["WiFi", "TV", "AC", "Balcony", "Jacuzzi", "Kitchen"] }
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Booking submitted:", formData);
    toast({
      title: "Booking Submitted!",
      description: "Your room reservation has been confirmed. Check your email for details.",
    });
  };

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Card className="shadow-lg border-blue-100">
      <CardHeader className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-t-lg">
        <CardTitle className="flex items-center gap-2">
          <Hotel className="h-5 w-5" />
          Book Your Room
        </CardTitle>
        <CardDescription className="text-blue-100">
          Find and reserve the perfect room for your stay
        </CardDescription>
      </CardHeader>
      <CardContent className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="checkIn" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Check-in Date
              </Label>
              <Input
                id="checkIn"
                type="date"
                value={formData.checkIn}
                onChange={(e) => handleInputChange("checkIn", e.target.value)}
                className="mt-1"
                required
              />
            </div>
            <div>
              <Label htmlFor="checkOut" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Check-out Date
              </Label>
              <Input
                id="checkOut"
                type="date"
                value={formData.checkOut}
                onChange={(e) => handleInputChange("checkOut", e.target.value)}
                className="mt-1"
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="guests" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Number of Guests
            </Label>
            <Input
              id="guests"
              type="number"
              min="1"
              max="8"
              value={formData.guests}
              onChange={(e) => handleInputChange("guests", parseInt(e.target.value))}
              className="mt-1"
              required
            />
          </div>

          <div>
            <Label className="text-sm font-medium mb-3 block">Select Room Type</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {roomTypes.map((room) => (
                <div
                  key={room.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-all ${
                    formData.roomType === room.id
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-blue-300"
                  }`}
                  onClick={() => handleInputChange("roomType", room.id)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-medium">{room.name}</h3>
                    <span className="font-bold text-blue-600">₨{room.price.toLocaleString()}/night</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {room.features.map((feature) => (
                      <Badge key={feature} variant="secondary" className="text-xs">
                        {feature}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={(e) => handleInputChange("firstName", e.target.value)}
                className="mt-1"
                required
              />
            </div>
            <div>
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) => handleInputChange("lastName", e.target.value)}
                className="mt-1"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                className="mt-1"
                required
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => handleInputChange("phone", e.target.value)}
                className="mt-1"
                required
              />
            </div>
          </div>

          <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" size="lg">
            <CreditCard className="h-4 w-4 mr-2" />
            Complete Booking
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
