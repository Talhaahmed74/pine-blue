import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Calendar, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

const HeroSection = () => {
  const navigate = useNavigate();
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState(1);

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
    <section
      className="relative bg-cover bg-center bg-no-repeat bg-fixed py-32"
      style={{
        backgroundImage: "url('/lovable-uploads/room5.jpg')", // 🔁 Replace with your actual image path
      }}
    >
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto backdrop-blur-md bg-white/10 border border-white/20 rounded-2xl shadow-xl flex flex-col md:flex-row items-center justify-between p-6 gap-6">

          {/* Check-in */}
          <div className="flex flex-col w-full md:w-auto">
            <label className="text-sm text-white font-medium mb-1 flex items-center gap-1">
              <Calendar className="w-4 h-4" /> Check in
            </label>
            <input
              type="date"
              value={checkIn}
              onChange={(e) => setCheckIn(e.target.value)}
              className="bg-white/20 border border-white/30 rounded-md px-3 py-2 text-white placeholder-white/60 text-sm focus:outline-none focus:ring-2 focus:ring-white/40"
              placeholder="DD-MM-YYYY"
              min={new Date().toISOString().split("T")[0]}
            />
          </div>

          {/* Divider */}
          <div className="hidden md:block w-px bg-white/20 h-8"></div>

          {/* Check-out */}
          <div className="flex flex-col w-full md:w-auto">
            <label className="text-sm text-white font-medium mb-1 flex items-center gap-1">
              <Calendar className="w-4 h-4" /> Check out
            </label>
            <input
              type="date"
              value={checkOut}
              onChange={(e) => setCheckOut(e.target.value)}
              className="bg-white/20 border border-white/30 rounded-md px-3 py-2 text-white placeholder-white/60 text-sm focus:outline-none focus:ring-2 focus:ring-white/40"
              placeholder="DD-MM-YYYY"
              min={checkIn || new Date().toISOString().split("T")[0]}
            />
          </div>

          {/* Divider */}
          <div className="hidden md:block w-px bg-white/20 h-8"></div>

          {/* Guests */}
          <div className="flex flex-col w-full md:w-auto">
            <label className="text-sm text-white font-medium mb-1 flex items-center gap-1">
              <Users className="w-4 h-4" /> Guests
            </label>
            <select
              value={guests}
              onChange={(e) => setGuests(Number(e.target.value))}
              className="bg-white/20 border border-white/30 rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-white/40"
            >
              <option value={1}>1 Person</option>
              <option value={2}>2 Persons</option>
              <option value={3}>3 Persons</option>
              <option value={4}>4 Persons</option>
              <option value={5}>5+ Persons</option>
            </select>
          </div>

          {/* Submit Button */}
          <div className="w-full md:w-auto">
            <Button
              onClick={handleSearch}
              className="bg-white/30 hover:bg-white/40 text-white font-semibold text-sm px-6 py-3 rounded-md w-full md:w-auto backdrop-blur-md transition duration-300"
            >
              CHECK AVAILABILITY
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
