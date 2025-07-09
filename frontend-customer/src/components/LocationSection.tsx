
import { Button } from "@/components/ui/button";
import { MapPin, ArrowRight } from "lucide-react";

const LocationSection = () => {
  return (
    <section className="py-24 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Text Content */}
          <div className="space-y-8">
            <div className="flex items-center space-x-2 text-primary">
              <MapPin className="h-5 w-5" />
              <span className="text-sm font-semibold uppercase tracking-wide">Mumbai</span>
            </div>
            
            <h2 className="text-5xl font-light text-gray-900 leading-tight">
              In the Heart of
              <span className="block font-normal">Mumbai's Elite District</span>
            </h2>
            
            <p className="text-lg text-gray-600 leading-relaxed">
              Nestled in Mumbai's most prestigious neighborhood, Blue Pine Resort offers unparalleled access to the city's finest dining, shopping, and cultural attractions. Experience the perfect blend of urban sophistication and serene luxury.
            </p>
            
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-primary rounded-full"></div>
                <span className="text-gray-700">5 minutes from Gateway of India</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-primary rounded-full"></div>
                <span className="text-gray-700">Walking distance to Marine Drive</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-primary rounded-full"></div>
                <span className="text-gray-700">Premium shopping at Colaba Causeway</span>
              </div>
            </div>
            
            <Button variant="outline" className="group mt-8">
              Explore Location
              <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>
          
          {/* Image Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-4">
              <img 
                src="https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=400&h=500&fit=crop" 
                alt="Luxury Room Interior" 
                className="w-full h-64 object-cover rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300"
              />
              <img 
                src="https://images.unsplash.com/photo-1590490360182-c33d57733427?w=400&h=300&fit=crop" 
                alt="Executive Suite" 
                className="w-full h-48 object-cover rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300"
              />
            </div>
            <div className="space-y-4 mt-8">
              <img 
                src="https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=400&h=300&fit=crop" 
                alt="Ocean View" 
                className="w-full h-48 object-cover rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300"
              />
              <img 
                src="https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=400&h=500&fit=crop" 
                alt="Presidential Suite" 
                className="w-full h-64 object-cover rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default LocationSection;
