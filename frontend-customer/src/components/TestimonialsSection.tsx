import { Star } from "lucide-react";

const TestimonialsSection = () => {
  const testimonials = [
    {
      name: "Sarah Johnson",
      review: "Pine Blue exceeded all my expectations. The mountain views of Murree were absolutely breathtaking, and the staff went above and beyond to make our stay memorable. The rooms were immaculate and the restaurant served the most delicious Pakistani and international food. Will definitely be back!",
      rating: 5,
      avatar: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=60&h=60&fit=crop&crop=face"
    },
    {
      name: "Robert Martinez",
      review: "An incredible experience from start to finish. Murree's location is perfect for anyone looking to escape the city and reconnect with nature. The amenities are top-notch and the service is impeccable. Highly recommend Pine Blue for a peaceful getaway in Pakistan's most beautiful hill station.",
      rating: 5,
      avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=60&h=60&fit=crop&crop=face"
    },
    {
      name: "Amanda Chen",
      review: "What a beautiful place to unwind! Pine Blue offers the perfect blend of luxury and tranquility in the heart of Murree. The mountain setting is gorgeous, the rooms are comfortable, and the overall atmosphere is so relaxing. This place truly feels like a home away from home in Pakistan's mountains.",
      rating: 5,
      avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=60&h=60&fit=crop&crop=face"
    }
  ];

  return (
    <section className="py-24 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-light text-gray-900 mb-4">OUR GUEST'S LOVE US</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <div key={index} className="bg-white p-8 rounded-lg shadow-lg">
              <div className="flex items-center mb-4">
                <img 
                  src={testimonial.avatar}
                  alt={testimonial.name}
                  className="w-12 h-12 rounded-full mr-4"
                />
                <div>
                  <h4 className="font-semibold text-gray-900">{testimonial.name}</h4>
                  <div className="flex">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                </div>
              </div>
              <p className="text-gray-600 leading-relaxed">{testimonial.review}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;