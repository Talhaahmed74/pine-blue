
-- Create enum for room status
CREATE TYPE room_status AS ENUM ('available', 'occupied', 'maintenance');

-- Create enum for booking status  
CREATE TYPE booking_status AS ENUM ('pending', 'confirmed', 'cancelled', 'completed');

-- Create enum for payment status
CREATE TYPE payment_status AS ENUM ('pending', 'completed', 'failed', 'refunded');

-- Create rooms table
CREATE TABLE public.rooms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  capacity INTEGER NOT NULL DEFAULT 2,
  amenities TEXT[] DEFAULT '{}',
  image_url TEXT,
  status room_status NOT NULL DEFAULT 'available',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create bookings table
CREATE TABLE public.bookings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID REFERENCES public.rooms(id) NOT NULL,
  guest_name TEXT NOT NULL,
  guest_email TEXT NOT NULL,
  guest_phone TEXT,
  check_in DATE NOT NULL,
  check_out DATE NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  status booking_status NOT NULL DEFAULT 'pending',
  special_requests TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create payments table
CREATE TABLE public.payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID REFERENCES public.bookings(id) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  payment_method TEXT,
  transaction_id TEXT,
  status payment_status NOT NULL DEFAULT 'pending',
  payment_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert sample rooms data
INSERT INTO public.rooms (name, description, price, capacity, amenities, image_url, status) VALUES
('Deluxe Ocean View', 'Spacious room with stunning ocean views and premium amenities', 8500.00, 2, ARRAY['Ocean View', 'King Bed', 'Mini Bar', 'Balcony', 'WiFi'], 'https://images.unsplash.com/photo-1721322800607-8c38375eef04', 'available'),
('Executive Suite', 'Luxurious suite with separate living area and work space', 12000.00, 4, ARRAY['Living Room', 'Kitchenette', 'Work Desk', 'City View'], 'https://images.unsplash.com/photo-1649972904349-6e44c42644a7', 'occupied'),
('Premium Studio', 'Modern studio with contemporary design and all amenities', 6500.00, 2, ARRAY['Modern Design', 'Work Space', 'Smart TV', 'Coffee Machine'], 'https://images.unsplash.com/photo-1488590528505-98d2b5aba04b', 'maintenance'),
('Luxury Presidential Suite', 'Ultimate luxury with private amenities and premium services', 25000.00, 6, ARRAY['Private Pool', 'Butler Service', 'Spa', 'Dining Room', 'Piano'], 'https://images.unsplash.com/photo-1721322800607-8c38375eef04', 'available'),
('Standard Double Room', 'Comfortable room with essential amenities for budget travelers', 4500.00, 2, ARRAY['Double Bed', 'WiFi', 'AC', 'Room Service'], 'https://images.unsplash.com/photo-1649972904349-6e44c42644a7', 'available'),
('Family Suite', 'Perfect for families with multiple bedrooms and kids area', 15000.00, 6, ARRAY['Two Bedrooms', 'Kids Area', 'Kitchen', 'Living Room'], 'https://images.unsplash.com/photo-1488590528505-98d2b5aba04b', 'available');

-- Insert sample bookings data
INSERT INTO public.bookings (room_id, guest_name, guest_email, guest_phone, check_in, check_out, total_amount, status) VALUES
((SELECT id FROM public.rooms WHERE name = 'Deluxe Ocean View'), 'John Doe', 'john@example.com', '+91 9876543210', '2024-01-15', '2024-01-18', 25500.00, 'confirmed'),
((SELECT id FROM public.rooms WHERE name = 'Executive Suite'), 'Jane Smith', 'jane@example.com', '+91 9876543211', '2024-01-20', '2024-01-22', 24000.00, 'pending'),
((SELECT id FROM public.rooms WHERE name = 'Premium Studio'), 'Mike Johnson', 'mike@example.com', '+91 9876543212', '2024-01-25', '2024-01-27', 13000.00, 'cancelled');

-- Insert sample payments data
INSERT INTO public.payments (booking_id, amount, payment_method, transaction_id, status, payment_date) VALUES
((SELECT id FROM public.bookings WHERE guest_name = 'John Doe'), 25500.00, 'Credit Card', 'TXN_001', 'completed', now()),
((SELECT id FROM public.bookings WHERE guest_name = 'Jane Smith'), 24000.00, 'UPI', 'TXN_002', 'pending', null);

-- Enable Row Level Security (Optional - for future authentication)
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;  
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Create policies to allow public access for now (you can restrict later)
CREATE POLICY "Allow public access to rooms" ON public.rooms FOR ALL USING (true);
CREATE POLICY "Allow public access to bookings" ON public.bookings FOR ALL USING (true);
CREATE POLICY "Allow public access to payments" ON public.payments FOR ALL USING (true);
