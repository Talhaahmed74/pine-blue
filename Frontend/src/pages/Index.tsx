import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { HotelBookingForm} from "@/components/HotelBookingForm"
import { BookingDashboard } from "@/components/BookingDashboard";
import { RoomManagement } from "@/components/RoomManagement";
import { BookingAnalytics } from "@/components/BookingAnalytics";
import { IntegrationManagement } from "@/components/IntegrationManagement";
import { HotelNavbar } from "@/components/HotelNavbar";
import { Calendar, Users, Settings, BarChart3, MapPin } from "lucide-react";

interface IndexProps {
  onLogout: () => void;
}

const Index = ({ onLogout }: IndexProps) => {
  const [activeTab, setActiveTab] = useState("booking");

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      <HotelNavbar onLogout={onLogout} />
      
      <div className="container mx-auto px-4 py-6">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-blue-800 mb-2 flex items-center gap-3">
            <img 
              src="/lovable-uploads/a54dd6f9-1eb2-410e-a933-505a4a28f126.png" 
              alt="Blue Pines Resort Logo" 
              className="h-12 w-auto"
            />
            Blue Pine Admin
          </h1>
          <p className="text-blue-600 text-lg">Complete booking management system for Blue Pine Resort</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5 mb-8 bg-white shadow-sm">
            <TabsTrigger value="booking" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Book Room
            </TabsTrigger>
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="rooms" className="flex items-center gap-2">
              <img 
                src="/lovable-uploads/a54dd6f9-1eb2-410e-a933-505a4a28f126.png" 
                alt="Blue Pines Logo" 
                className="h-4 w-4"
              />
              Rooms
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="integrations" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Integrations
            </TabsTrigger>
          </TabsList>

          <TabsContent value="booking" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <HotelBookingForm />
              </div>
              <div className="space-y-4">
                <Card className="shadow-lg border-blue-100">
                  <CardHeader className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-t-lg">
                    <CardTitle className="flex items-center gap-2">
                      <MapPin className="h-5 w-5" />
                      Resort Features
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-blue-100 text-blue-800">Free WiFi</Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-green-100 text-green-800">Pool</Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-purple-100 text-purple-800">Spa</Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-orange-100 text-orange-800">Restaurant</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="dashboard">
            <BookingDashboard />
          </TabsContent>

          <TabsContent value="rooms">
            <RoomManagement />
          </TabsContent>

          <TabsContent value="analytics">
            <BookingAnalytics />
          </TabsContent>

          <TabsContent value="integrations">
            <IntegrationManagement />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;
