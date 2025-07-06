// components/GuestDetails.tsx
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

export const GuestDetails = ({ formData, onChange }) => (
  <div className="space-y-4">
    <h3 className="text-lg font-semibold">Guest Details</h3>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label>First Name</Label>
        <Input
          value={formData.firstName}
          onChange={(e) => onChange("firstName", e.target.value)}
          required
        />
      </div>
      <div className="space-y-2">
        <Label>Last Name</Label>
        <Input
          value={formData.lastName}
          onChange={(e) => onChange("lastName", e.target.value)}
          required
        />
      </div>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label>Email Address</Label>
        <Input
          type="email"
          value={formData.email}
          onChange={(e) => onChange("email", e.target.value)}
          required
        />
      </div>
      <div className="space-y-2">
        <Label>Phone Number</Label>
        <Input
          type="tel"
          value={formData.phone}
          onChange={(e) => onChange("phone", e.target.value)}
          required
        />
      </div>
    </div>
  </div>
);
