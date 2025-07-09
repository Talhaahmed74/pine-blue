
import { Wifi, Car, Utensils, Waves, Dumbbell, Coffee, Sparkles, Shield } from "lucide-react";

const LuxuryAmenities = () => {
  const amenities = [
    {
      icon: Wifi,
      title: "High-Speed WiFi",
      description: "Complimentary high-speed internet throughout the property"
    },
    {
      icon: Car,
      title: "Valet Parking",
      description: "24/7 valet parking service for your convenience"
    },
    {
      icon: Utensils,
      title: "Fine Dining",
      description: "World-class restaurants with international cuisine"
    },
    {
      icon: Waves,
      title: "Infinity Pool",
      description: "Rooftop infinity pool with panoramic city views"
    },
    {
      icon: Dumbbell,
      title: "Fitness Center",
      description: "State-of-the-art gymnasium with personal trainers"
    },
    {
      icon: Coffee,
      title: "24/7 Room Service",
      description: "Round-the-clock room service at your disposal"
    },
    {
      icon: Sparkles,
      title: "Spa & Wellness",
      description: "Luxury spa treatments and wellness programs"
    },
    {
      icon: Shield,
      title: "Concierge Service",
      description: "Dedicated concierge for personalized assistance"
    }
  ];

  return (
    <section className="py-24 bg-slate-900 text-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-5xl font-light mb-6">
            Luxurious
            <span className="block font-normal">Amenities & Services</span>
          </h2>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Every detail crafted to perfection for an unforgettable experience
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {amenities.map((amenity, index) => (
            <div 
              key={index} 
              className="text-center group hover:transform hover:scale-105 transition-all duration-300"
            >
              <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-primary/30 transition-colors">
                <amenity.icon className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{amenity.title}</h3>
              <p className="text-gray-400 text-sm leading-relaxed">{amenity.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default LuxuryAmenities;
