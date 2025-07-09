import { Star } from "lucide-react";


const TestimonialsSection = () => {
  const testimonials = [
    {
      name: "Ahmed",
      review: "Blue Pine Resort exceeded all my expectations. The mountain views of Murree were absolutely breathtaking, and the staff went above and beyond to make our stay memorable. The rooms were immaculate and the restaurant served the most delicious Pakistani and international food. Will definitely be back!",
      rating: 5,
      avatar: "lovable-uploads/profile.jpg"
    },
    {
      name: "Kamran",
      review: "An incredible experience from start to finish. Murree's location is perfect for anyone looking to escape the city and reconnect with nature. The amenities are top-notch and the service is impeccable. Highly recommend Blue Pine Resort for a peaceful getaway in Pakistan's most beautiful hill station.",
      rating: 5,
      avatar: "lovable-uploads/profile.jpg"
    },
    {
      name: "Sara",
      review: "What a beautiful place to unwind! Blue Pine Resort offers the perfect blend of luxury and tranquility in the heart of Murree. The mountain setting is gorgeous, the rooms are comfortable, and the overall atmosphere is so relaxing. This place truly feels like a home away from home in Pakistan's mountains.",
      rating: 5,
      avatar: "lovable-uploads/profile.jpg"
    }
  ];

  return (
    <section className="py-24 bg-gray-50">
      <div className="container mx-auto px-4">
       {/* Instagram-Style Feed Section */}
        <div className="text-center mb-10">
          <h2 className="text-4xl font-light text-gray-900">FOLLOW US</h2>
          <p className="text-gray-600 mt-2">A glimpse of the Murree hills and our resort's cozy comfort</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          <img src="/lovable-uploads/post10.jpg" alt="Murree Hills" className="rounded-lg object-cover w-full h-64" />
          <img src="/lovable-uploads/post5.jpg" alt="Hotel Room" className="rounded-lg object-cover w-full h-64" />
          <img src="/lovable-uploads/post9.jpg" alt="Mountain Travel" className="rounded-lg object-cover w-full h-64" />
          <img src="/lovable-uploads/post8.jpg" alt="Resort Interior" className="rounded-lg object-cover w-full h-64" />
          
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
