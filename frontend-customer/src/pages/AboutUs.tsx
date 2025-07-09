
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Users, Award, MapPin, Phone, Mail, Clock } from "lucide-react";

const AboutUs = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-primary to-orange-500 py-20">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-5xl font-bold text-white mb-6">About Blue Pine Resort</h1>
          <p className="text-xl text-white/90 max-w-3xl mx-auto">
            Experience luxury redefined at Blue Pine Resort, where exceptional hospitality meets world-class amenities in the heart of Mumbai.
          </p>
        </div>
      </section>

      {/* Story Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl font-bold text-gray-900 mb-6">Our Story</h2>
              <p className="text-lg text-gray-600 mb-6">
                Founded in 2010, Blue Pine Resort has been a beacon of luxury hospitality in Mumbai. 
                Our commitment to excellence and attention to detail has made us a preferred destination 
                for discerning travelers from around the world.
              </p>
              <p className="text-lg text-gray-600 mb-6">
                With over a decade of experience, we've perfected the art of creating unforgettable 
                experiences that blend traditional Indian hospitality with modern luxury amenities.
              </p>
              <div className="grid grid-cols-3 gap-4 mt-8">
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary">500+</div>
                  <div className="text-sm text-gray-600">Happy Guests</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary">50+</div>
                  <div className="text-sm text-gray-600">Luxury Rooms</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary">13+</div>
                  <div className="text-sm text-gray-600">Years of Excellence</div>
                </div>
              </div>
            </div>
            <div>
              <img 
                src="https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=600&h=400&fit=crop" 
                alt="Blue Pine Resort" 
                className="rounded-lg shadow-xl"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-center text-gray-900 mb-12">Why Choose Us</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Award className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-4">Award-Winning Service</h3>
              <p className="text-gray-600">
                Recognized for excellence in hospitality with multiple industry awards and certifications.
              </p>
            </div>
            <div className="text-center">
              <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <MapPin className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-4">Prime Location</h3>
              <p className="text-gray-600">
                Strategically located in Mumbai with easy access to business districts and tourist attractions.
              </p>
            </div>
            <div className="text-center">
              <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-4">Personalized Experience</h3>
              <p className="text-gray-600">
                Tailored services and amenities designed to exceed your expectations at every turn.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-16 bg-gray-100">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold text-gray-900 mb-8">Our Mission</h2>
          <p className="text-xl text-gray-600 max-w-4xl mx-auto">
            To provide an exceptional hospitality experience that creates lasting memories for our guests 
            while maintaining the highest standards of service, comfort, and luxury. We are committed to 
            sustainable practices and contributing positively to our local community.
          </p>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default AboutUs;
