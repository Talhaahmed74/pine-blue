
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Database, Loader2 } from 'lucide-react';
import { addDummyRooms } from '@/utils/dummyData';
import { toast } from 'sonner';

interface DummyDataButtonProps {
  onDataAdded: () => void;
}

const DummyDataButton = ({ onDataAdded }: DummyDataButtonProps) => {
  const [loading, setLoading] = useState(false);

  const handleAddDummyData = async () => {
    setLoading(true);
    try {
      const result = await addDummyRooms();
      if (result.success) {
        toast.success('Dummy rooms added successfully!');
        onDataAdded();
      } else {
        toast.error('Failed to add dummy rooms');
      }
    } catch (error) {
      toast.error('Error adding dummy data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button 
      variant="outline" 
      onClick={handleAddDummyData}
      disabled={loading}
      className="flex items-center gap-2"
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Database className="h-4 w-4" />
      )}
      Add Sample Rooms
    </Button>
  );
};

export default DummyDataButton;
