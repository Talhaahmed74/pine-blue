import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Calendar, Users, Star } from "lucide-react";
import { toast } from "sonner";

const HeroSection = () => {
  const navigate = useNavigate();
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState(2);

  const handleSearch = () => {
    if (!checkIn || !checkOut) {
      toast.error("Please select check-in and check-out dates");
      return;
    }
    
    if (new Date(checkIn) >= new Date(checkOut)) {
      toast.error("Check-out date must be after check-in date");
      return;
    }

    navigate(`/rooms?checkin=${checkIn}&checkout=${checkOut}&guests=${guests}`);
    toast.success("Searching available rooms...");
  };

  return (
    <section className="relative min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Video Background */}
      <div className="absolute inset-0 overflow-hidden">
        <video 
          autoPlay 
          muted 
          loop 
          className="w-full h-full object-cover opacity-70"
        >
          <source src="https://cdn.pixabay.com/video/2022/04/21/115033-703750523_large.mp4" type="video/mp4" />
          {/* Fallback image if video doesn't load */}
          <div 
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{
              backgroundImage: "url('https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1920&h=1080&fit=crop')"
            }}
          />
        </video>
        {/* Dark overlay for better text readability */}
        <div className="absolute inset-0 bg-black/40"></div>
      </div>
      
      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 pt-32 pb-32">
        <div className="text-center max-w-4xl mx-auto">
          {/* Main Heading */}
          <h1 className="text-6xl md:text-7xl font-light text-white mb-6 animate-fade-in-up">
            A Breath of Fresh Air.
            <span className="block font-normal">A Place to Call Home.</span>
          </h1>
          
          <p className="text-xl text-gray-300 mb-12 animate-fade-in-up max-w-2xl mx-auto" style={{animationDelay: '0.2s'}}>
            Nestled in the heart of Murree's majestic hills, Pine Blue offers a tranquil escape that feels like coming home. Experience the beauty of Pakistan's premier hill station with breathtaking mountain views.
          </p>
          
          {/* Search Form */}
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-6 md:p-8 max-w-5xl mx-auto animate-fade-in-up mb-16" style={{animationDelay: '0.4s'}}>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-6">
              <div className="flex flex-col">
                <label className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Check-in</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 z-10" />
                  <input
                    type="date"
                    value={checkIn}
                    onChange={(e) => setCheckIn(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 md:py-4 border-2 border-gray-200 rounded-xl cursor-pointer hover:border-primary focus:border-primary transition-all duration-300 bg-white hover:shadow-md focus:outline-none"
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
              </div>
              
              <div className="flex flex-col">
                <label className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Check-out</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 z-10" />
                  <input
                    type="date"
                    value={checkOut}
                    onChange={(e) => setCheckOut(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 md:py-4 border-2 border-gray-200 rounded-xl cursor-pointer hover:border-primary focus:border-primary transition-all duration-300 bg-white hover:shadow-md focus:outline-none"
                    min={checkIn || new Date().toISOString().split('T')[0]}
                  />
                </div>
              </div>
              
              <div className="flex flex-col">
                <label className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Guests</label>
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 z-10" />
                  <select
                    value={guests}
                    onChange={(e) => setGuests(Number(e.target.value))}
                    className="w-full pl-10 pr-4 py-3 md:py-4 border-2 border-gray-200 rounded-xl cursor-pointer hover:border-primary focus:border-primary transition-all duration-300 bg-white hover:shadow-md focus:outline-none appearance-none"
                  >
                    <option value={1}>1 Guest</option>
                    <option value={2}>2 Guests</option>
                    <option value={3}>3 Guests</option>
                    <option value={4}>4 Guests</option>
                    <option value={5}>5+ Guests</option>
                  </select>
                </div>
              </div>
              
              <div className="flex items-end">
                <Button 
                  onClick={handleSearch}
                  className="w-full h-12 md:h-14 text-base md:text-lg font-semibold bg-gradient-to-r from-primary to-orange-500 hover:from-primary/90 hover:to-orange-500/90 border-0 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
                >
                  CHECK AVAILABILITY
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;