// components/BillingSection.tsx
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";

export const BillingSection = ({ formData, onChange }) => (
  <div className="space-y-4">
    <h3 className="text-lg font-semibold">Billing Information</h3>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label>Status</Label>
        <Select value={formData.status} onValueChange={(val) => onChange("status", val)}>
          <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="confirmed">Confirmed</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Source</Label>
        <Select value={formData.source} onValueChange={(val) => onChange("source", val)}>
          <SelectTrigger><SelectValue placeholder="Select source" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="Direct">Direct</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="space-y-2">
        <Label>Discount (%)</Label>
        <Input
          type="number"
          min="0"
          max="100"
          value={formData.discount}
          onChange={(e) => onChange("discount", parseFloat(e.target.value) || 0)}
        />
      </div>
      <div className="space-y-2">
        <Label>VAT (%)</Label>
        <Input
          type="number"
          min="0"
          max="100"
          value={formData.vat}
          onChange={(e) => onChange("vat", parseFloat(e.target.value) || 0)}
        />
      </div>
      <div className="space-y-2">
        <Label>Total Amount (₨)</Label>
        <Input type="number" value={formData.totalAmount.toFixed(2)} readOnly className="bg-gray-50" />
      </div>
    </div>
  </div>
);
