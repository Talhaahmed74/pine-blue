
import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Calendar, MapPin, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { toast } from 'sonner';

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const bookingId = searchParams.get('booking_id');
  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBooking = async () => {
      if (!bookingId) return;
      
      try {
        const { data, error } = await supabase
          .from('bookings')
          .select(`
            *,
            rooms (
              name,
              image_url,
              amenities
            )
          `)
          .eq('id', bookingId)
          .single();

        if (error) throw error;
        
        // Update booking status to confirmed
        await supabase
          .from('bookings')
          .update({ status: 'confirmed' })
          .eq('id', bookingId);

        setBooking(data);
        toast.success('Payment successful! Your booking is confirmed.');
      } catch (error: any) {
        toast.error('Error fetching booking details');
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchBooking();
  }, [bookingId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-16 text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Processing your booking...</p>
        </div>
        <Footer />
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Booking Not Found</h1>
          <Link to="/">
            <Button>Go Home</Button>
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Payment Successful!</h1>
            <p className="text-gray-600">Your booking has been confirmed</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Booking Confirmation</CardTitle>
              <p className="text-sm text-gray-500">Booking ID: {booking.id}</p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center space-x-4">
                <img 
                  src={booking.rooms.image_url}
                  alt={booking.rooms.name}
                  className="w-20 h-20 object-cover rounded-lg"
                />
                <div>
                  <h3 className="font-semibold text-lg">{booking.rooms.name}</h3>
                  <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                    <div className="flex items-center space-x-1">
                      <Calendar className="h-4 w-4" />
                      <span>{new Date(booking.check_in).toLocaleDateString()} - {new Date(booking.check_out).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Users className="h-4 w-4" />
                      <span>Guest: {booking.guest_name}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="flex justify-between items-center text-lg font-semibold">
                  <span>Total Amount Paid:</span>
                  <span className="text-primary">₹{Number(booking.total_amount).toLocaleString()}</span>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-semibold mb-2">Guest Information:</h4>
                <div className="text-sm text-gray-600 space-y-1">
                  <p><strong>Name:</strong> {booking.guest_name}</p>
                  <p><strong>Email:</strong> {booking.guest_email}</p>
                  {booking.guest_phone && <p><strong>Phone:</strong> {booking.guest_phone}</p>}
                  {booking.special_requests && (
                    <p><strong>Special Requests:</strong> {booking.special_requests}</p>
                  )}
                </div>
              </div>

              <div className="flex space-x-4">
                <Link to="/dashboard" className="flex-1">
                  <Button className="w-full">View My Bookings</Button>
                </Link>
                <Link to="/" className="flex-1">
                  <Button variant="outline" className="w-full">Back to Home</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      
      <Footer />
    </div>
  );
};

export default PaymentSuccess;
