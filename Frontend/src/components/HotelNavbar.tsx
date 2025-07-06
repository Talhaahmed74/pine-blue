
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, Settings, User, LogOut } from "lucide-react";

interface HotelNavbarProps {
  onLogout: () => void;
}

export const HotelNavbar = ({ onLogout }: HotelNavbarProps) => {
  return (
    <nav className="bg-white shadow-md border-b border-blue-100">
      <div className="container mx-auto px-4 py-3">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <img 
                src="/lovable-uploads/a54dd6f9-1eb2-410e-a933-505a4a28f126.png" 
                alt="Blue Pines Resort Logo" 
                className="h-8 sm:h-10 w-auto flex-shrink-0"
              />
              <span className="text-lg sm:text-xl font-bold text-blue-800 truncate">
                Blue Pines Online
              </span>
              <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200 hidden xs:inline-flex">
                Premium
              </Badge>
            </div>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-4">
            <Button variant="outline" size="sm" className="relative hidden sm:flex">
              <Bell className="h-4 w-4" />
              <Badge className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
                5
              </Badge>
            </Button>
            <Button variant="outline" size="sm" className="hidden sm:flex">
              <Settings className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" className="hidden sm:flex">
              <User className="h-4 w-4" />
              <span className="hidden md:inline">Admin</span>
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onLogout}
              className="text-red-600 hover:text-red-700 hover:bg-red-50 flex-shrink-0"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline ml-1">Logout</span>
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
};
