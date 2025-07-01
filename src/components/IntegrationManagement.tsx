import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Settings, Link, CheckCircle, AlertCircle, Globe, Smartphone } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export const IntegrationManagement = () => {
  const { toast } = useToast();
  const [integrations, setIntegrations] = useState([
    {
      id: "booking-com",
      name: "Booking.com",
      description: "Sync your inventory and bookings with Booking.com",
      icon: Globe,
      connected: true,
      lastSync: "2 hours ago",
      status: "active"
    },
    {
      id: "expedia",
      name: "Expedia",
      description: "Manage your Expedia listings and reservations",
      icon: Globe,
      connected: true,
      lastSync: "1 hour ago",
      status: "active"
    },
    {
      id: "airbnb",
      name: "Airbnb",
      description: "Connect with Airbnb for short-term rental management",
      icon: Smartphone,
      connected: false,
      lastSync: "Never",
      status: "inactive"
    },
    {
      id: "hotels-com",
      name: "Hotels.com",
      description: "Expand your reach with Hotels.com integration",
      icon: Globe,
      connected: true,
      lastSync: "3 hours ago",
      status: "warning"
    }
  ]);

  const handleToggleIntegration = (id: string) => {
    setIntegrations(prev => 
      prev.map(integration => 
        integration.id === id 
          ? { ...integration, connected: !integration.connected }
          : integration
      )
    );
    
    toast({
      title: "Integration Updated",
      description: "Your integration settings have been updated successfully.",
    });
  };

  const handleSyncNow = (name: string) => {
    toast({
      title: "Sync Started",
      description: `Syncing data with ${name}. This may take a few minutes.`,
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "warning":
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case "inactive":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "warning":
        return "bg-yellow-100 text-yellow-800";
      case "inactive":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Integration Management</h2>
          <p className="text-gray-600">Connect with booking platforms to manage all your reservations in one place</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {integrations.map((integration) => (
          <Card key={integration.id} className="shadow-lg">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-50 p-2 rounded-lg">
                    <integration.icon className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{integration.name}</CardTitle>
                    <p className="text-sm text-gray-600">{integration.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusIcon(integration.status)}
                  <Switch
                    checked={integration.connected}
                    onCheckedChange={() => handleToggleIntegration(integration.id)}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Status</p>
                  <Badge className={getStatusColor(integration.status)}>
                    {integration.connected ? "Connected" : "Disconnected"}
                  </Badge>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">Last Sync</p>
                  <p className="text-sm font-medium">{integration.lastSync}</p>
                </div>
              </div>
              
              {integration.connected && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor={`${integration.id}-username`} className="text-xs">Username/ID</Label>
                      <Input
                        id={`${integration.id}-username`}
                        placeholder="Enter your ID"
                        className="mt-1 h-8 text-sm"
                      />
                    </div>
                    <div>
                      <Label htmlFor={`${integration.id}-api-key`} className="text-xs">API Key</Label>
                      <Input
                        id={`${integration.id}-api-key`}
                        type="password"
                        placeholder="Enter API key"
                        className="mt-1 h-8 text-sm"
                      />
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleSyncNow(integration.name)}
                      className="flex-1"
                    >
                      <Link className="h-4 w-4 mr-2" />
                      Sync Now
                    </Button>
                    <Button variant="outline" size="sm">
                      <Settings className="h-4 w-4 mr-2" />
                      Settings
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Sync Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="font-medium">Automatic Sync</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="sync-inventory">Sync Room Inventory</Label>
                  <Switch id="sync-inventory" defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="sync-rates">Sync Room Rates</Label>
                  <Switch id="sync-rates" defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="sync-bookings">Sync New Bookings</Label>
                  <Switch id="sync-bookings" defaultChecked />
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <h4 className="font-medium">Sync Frequency</h4>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="sync-interval">Sync Interval</Label>
                  <select className="w-full mt-1 p-2 border rounded-md">
                    <option value="15">Every 15 minutes</option>
                    <option value="30">Every 30 minutes</option>
                    <option value="60">Every hour</option>
                    <option value="120">Every 2 hours</option>
                  </select>
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="sync-notifications">Sync Notifications</Label>
                  <Switch id="sync-notifications" defaultChecked />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
