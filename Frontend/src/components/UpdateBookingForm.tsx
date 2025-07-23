import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Edit, Save, X } from "lucide-react";
import axios from "axios";

interface BookingData {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  contact: string;
  check_in: string;
  check_out: string;
  room_type: "Standard" | "Deluxe" | "Suite" | "Penthouse";
  room_number: string;
  discount: number;
  vat: number;
  payment_status: "Confirmed" | "Pending";
  source: "Direct" | "Online" | "Phone";
  payment_method: "Cash" | "Card" | "Online";
  payment_status_billing: "Pending" | "Paid";
}

interface BookingUpdateFormProps {
  booking: any; // The booking data from your table
  onBookingUpdate: (updatedBooking: any) => void;
}

const ROOM_PRICES = {
  Standard: 35000,
  Deluxe: 52500,
  Suite: 81700,
  Penthouse: 131300,
};

export const BookingUpdateForm: React.FC<BookingUpdateFormProps> = ({
  booking,
  onBookingUpdate,
}) => {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
  const [formData, setFormData] = useState<BookingData>({
    id: booking.id || "",
    first_name: booking.first_name || "",
    last_name: booking.last_name || "",
    email: booking.email || "",
    contact: booking.contact || "",
    check_in: booking.check_in || "",
    check_out: booking.check_out || "",
    room_type: booking.room_type || "Standard",
    room_number: booking.room_number || "",
    discount: booking.discount || 0,
    vat: booking.vat || 16,
    payment_status: booking.payment_status || "Pending",
    source: booking.source || "Direct",
    payment_method: booking.payment_method || "Cash",
    payment_status_billing: booking.payment_status_billing || "Pending",
  });

  const [calculatedAmount, setCalculatedAmount] = useState(0);

  // Calculate total amount whenever relevant fields change
  useEffect(() => {
    calculateTotalAmount();
  }, [formData.room_type, formData.check_in, formData.check_out, formData.discount, formData.vat]);

  const calculateTotalAmount = () => {
    if (!formData.check_in || !formData.check_out) {
      setCalculatedAmount(0);
      return;
    }

    const checkInDate = new Date(formData.check_in);
    const checkOutDate = new Date(formData.check_out);
    const timeDiff = checkOutDate.getTime() - checkInDate.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));

    if (daysDiff <= 0) {
      setCalculatedAmount(0);
      return;
    }

    const basePrice = ROOM_PRICES[formData.room_type];
    const subtotal = basePrice * daysDiff;
    const discountAmount = (subtotal * formData.discount) / 100;
    const afterDiscount = subtotal - discountAmount;
    const vatAmount = (afterDiscount * formData.vat) / 100;
    const total = afterDiscount + vatAmount;

    setCalculatedAmount(Math.round(total));
  };

  const handleInputChange = (field: keyof BookingData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Validate required fields
      if (!formData.first_name || !formData.last_name || !formData.email) {
        toast({
          title: "Validation Error",
          description: "Please fill in all required fields.",
          variant: "destructive",
        });
        return;
      }

      // Validate dates
      if (new Date(formData.check_in) >= new Date(formData.check_out)) {
        toast({
          title: "Date Error",
          description: "Check-out date must be after check-in date.",
          variant: "destructive",
        });
        return;
      }

      // Prepare data for API
      const updateData = {
        ...formData,
        total_amount: calculatedAmount,
      };

      // Make API call to update booking
      const response = await axios.put(
        `${API_BASE_URL}/update-booking/${formData.id}`,
        updateData
      );

      // Update the booking in parent component
      onBookingUpdate(response.data);

      toast({
        title: "Booking Updated",
        description: "Booking has been successfully updated.",
        variant: "default",
      });

      setIsOpen(false);
    } catch (error) {
      console.error("Update failed:", error);
      toast({
        title: "Update Failed",
        description: "Failed to update booking. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Edit className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5" />
            Update Booking - {formData.id}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Guest Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Guest Information</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="first_name">First Name *</Label>
                <Input
                  id="first_name"
                  value={formData.first_name}
                  onChange={(e) => handleInputChange("first_name", e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="last_name">Last Name *</Label>
                <Input
                  id="last_name"
                  value={formData.last_name}
                  onChange={(e) => handleInputChange("last_name", e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="contact">Contact</Label>
                <Input
                  id="contact"
                  value={formData.contact}
                  onChange={(e) => handleInputChange("contact", e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Room Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Room Information</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="check_in">Check-in Date</Label>
                <Input
                  id="check_in"
                  type="date"
                  value={formData.check_in}
                  onChange={(e) => handleInputChange("check_in", e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="check_out">Check-out Date</Label>
                <Input
                  id="check_out"
                  type="date"
                  value={formData.check_out}
                  onChange={(e) => handleInputChange("check_out", e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="room_type">Room Type</Label>
                <Select
                  value={formData.room_type}
                  onValueChange={(value) => handleInputChange("room_type", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Standard">Standard (₨35,000/night)</SelectItem>
                    <SelectItem value="Deluxe">Deluxe (₨52,500/night)</SelectItem>
                    <SelectItem value="Suite">Suite (₨81,700/night)</SelectItem>
                    <SelectItem value="Penthouse">Penthouse (₨131,300/night)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="room_number">Room Number</Label>
                <Input
                  id="room_number"
                  value={formData.room_number}
                  onChange={(e) => handleInputChange("room_number", e.target.value)}
                  placeholder="e.g., 101, 205A"
                />
              </div>
            </CardContent>
          </Card>

          {/* Billing Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Billing Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <Label htmlFor="discount">Discount (%)</Label>
                  <Input
                    id="discount"
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={formData.discount}
                    onChange={(e) => handleInputChange("discount", parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <Label htmlFor="vat">VAT (%)</Label>
                  <Input
                    id="vat"
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={formData.vat}
                    onChange={(e) => handleInputChange("vat", parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <Label>Total Amount</Label>
                  <div className="p-2 border rounded-md bg-gray-50 font-bold text-lg">
                    ₨{calculatedAmount.toLocaleString()}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="payment_status">Payment Status</Label>
                  <Select
                    value={formData.payment_status}
                    onValueChange={(value) => handleInputChange("payment_status", value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Confirmed">Confirmed</SelectItem>
                      <SelectItem value="Pending">Pending</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="source">Source</Label>
                  <Select
                    value={formData.source}
                    onValueChange={(value) => handleInputChange("source", value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Direct">Direct</SelectItem>
                      <SelectItem value="Online">Online</SelectItem>
                      <SelectItem value="Phone">Phone</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="payment_method">Payment Method</Label>
                  <Select
                    value={formData.payment_method}
                    onValueChange={(value) => handleInputChange("payment_method", value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Cash">Cash</SelectItem>
                      <SelectItem value="Card">Card</SelectItem>
                      <SelectItem value="Online">Online</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="payment_status_billing">Payment Status</Label>
                  <Select
                    value={formData.payment_status_billing}
                    onValueChange={(value) => handleInputChange("payment_status_billing", value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Pending">Pending</SelectItem>
                      <SelectItem value="Paid">Paid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isLoading}
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Save className="h-4 w-4 mr-2" />
              {isLoading ? "Updating..." : "Update Booking"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};