
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, Settings, User } from "lucide-react";

export const HotelNavbar = () => {
  return (
    <nav className="bg-white shadow-md border-b border-blue-100">
      <div className="container mx-auto px-4 py-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <img 
                src="/lovable-uploads/a54dd6f9-1eb2-410e-a933-505a4a28f126.png" 
                alt="Blue Pines Resort Logo" 
                className="h-10 w-auto"
              />
              <span className="text-xl font-bold text-blue-800">Blue Pines Online</span>
            </div>
            <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200">
              Premium
            </Badge>
          </div>
          
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" className="relative">
              <Bell className="h-4 w-4" />
              <Badge className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
                5
              </Badge>
            </Button>
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm">
              <User className="h-4 w-4" />
              Admin
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
};
