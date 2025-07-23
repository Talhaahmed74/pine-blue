
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { X, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AddRoomDialogProps {
  onRoomAdded: () => void;
}

const AddRoomDialog = ({ onRoomAdded }: AddRoomDialogProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    capacity: '2',
    status: 'available',
    image_url: '',
    amenities: [] as string[]
  });
  const [newAmenity, setNewAmenity] = useState('');

  const predefinedAmenities = [
    'WiFi', 'AC', 'TV', 'Balcony', 'Mini Bar', 
    'Room Service', 'Sea View', 'City View', 'Gym Access'
  ];

  const addAmenity = (amenity: string) => {
    if (amenity && !formData.amenities.includes(amenity)) {
      setFormData(prev => ({
        ...prev,
        amenities: [...prev.amenities, amenity]
      }));
      setNewAmenity('');
    }
  };

  const removeAmenity = (amenity: string) => {
    setFormData(prev => ({
      ...prev,
      amenities: prev.amenities.filter(a => a !== amenity)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.from('rooms').insert({
        name: formData.name,
        description: formData.description,
        price: Number(formData.price),
        capacity: Number(formData.capacity),
        status: formData.status as any,
        image_url: formData.image_url || 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800',
        amenities: formData.amenities
      });

      if (error) throw error;

      toast.success('Room added successfully!');
      setFormData({
        name: '', description: '', price: '', capacity: '2',
        status: 'available', image_url: '', amenities: []
      });
      setOpen(false);
      onRoomAdded();
    } catch (error: any) {
      toast.error('Failed to add room: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add New Room
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Room</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Room Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                required
              />
            </div>
            <div>
              <Label htmlFor="price">Price per Night (Rs)</Label>
              <Input
                id="price"
                type="number"
                value={formData.price}
                onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                required
              />
            </div>
          </div>
          
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="capacity">Capacity</Label>
              <Select value={formData.capacity} onValueChange={(value) => setFormData(prev => ({ ...prev, capacity: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 Guest</SelectItem>
                  <SelectItem value="2">2 Guests</SelectItem>
                  <SelectItem value="3">3 Guests</SelectItem>
                  <SelectItem value="4">4 Guests</SelectItem>
                  <SelectItem value="6">6 Guests</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={formData.status} onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="occupied">Occupied</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="image_url">Image URL</Label>
            <Input
              id="image_url"
              value={formData.image_url}
              onChange={(e) => setFormData(prev => ({ ...prev, image_url: e.target.value }))}
              placeholder="https://example.com/image.jpg"
            />
          </div>

          <div>
            <Label>Amenities</Label>
            <div className="flex flex-wrap gap-2 mb-2">
              {formData.amenities.map((amenity) => (
                <Badge key={amenity} variant="secondary" className="flex items-center gap-1">
                  {amenity}
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => removeAmenity(amenity)}
                  />
                </Badge>
              ))}
            </div>
            <div className="flex gap-2 mb-2">
              <Input
                value={newAmenity}
                onChange={(e) => setNewAmenity(e.target.value)}
                placeholder="Add custom amenity"
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addAmenity(newAmenity))}
              />
              <Button type="button" onClick={() => addAmenity(newAmenity)} size="sm">
                Add
              </Button>
            </div>
            <div className="flex flex-wrap gap-1">
              {predefinedAmenities.map((amenity) => (
                <Button
                  key={amenity}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addAmenity(amenity)}
                  disabled={formData.amenities.includes(amenity)}
                >
                  {amenity}
                </Button>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Adding...' : 'Add Room'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddRoomDialog;
