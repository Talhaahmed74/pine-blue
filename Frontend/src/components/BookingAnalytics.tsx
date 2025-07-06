
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { TrendingUp, DollarSign, Users, Calendar } from "lucide-react";

export const BookingAnalytics = () => {
  const monthlyRevenue = [
    { month: "Jan", revenue: 45000, bookings: 120 },
    { month: "Feb", revenue: 52000, bookings: 135 },
    { month: "Mar", revenue: 48000, bookings: 125 },
    { month: "Apr", revenue: 61000, bookings: 150 },
    { month: "May", revenue: 55000, bookings: 142 },
    { month: "Jun", revenue: 67000, bookings: 165 }
  ];

  const occupancyData = [
    { day: "Mon", occupancy: 65 },
    { day: "Tue", occupancy: 72 },
    { day: "Wed", occupancy: 58 },
    { day: "Thu", occupancy: 85 },
    { day: "Fri", occupancy: 92 },
    { day: "Sat", occupancy: 98 },
    { day: "Sun", occupancy: 88 }
  ];

  const bookingSourceData = [
    { name: "Direct Booking", value: 35, color: "#8B5CF6" },
    { name: "Booking.com", value: 28, color: "#3B82F6" },
    { name: "Expedia", value: 20, color: "#F59E0B" },
    { name: "Airbnb", value: 12, color: "#10B981" },
    { name: "Others", value: 5, color: "#6B7280" }
  ];

  const keyMetrics = [
    {
      title: "Average Daily Rate",
      value: "$185",
      change: "+5.2%",
      icon: DollarSign,
      color: "text-green-600"
    },
    {
      title: "Occupancy Rate",
      value: "78%",
      change: "+3.1%",
      icon: Calendar,
      color: "text-blue-600"
    },
    {
      title: "Revenue Per Room",
      value: "$144",
      change: "+8.7%",
      icon: TrendingUp,
      color: "text-purple-600"
    },
    {
      title: "Guest Satisfaction",
      value: "4.7/5",
      change: "+0.2",
      icon: Users,
      color: "text-orange-600"
    }
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {keyMetrics.map((metric, index) => (
          <Card key={index} className="shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">{metric.title}</p>
                  <p className="text-2xl font-bold">{metric.value}</p>
                  <p className={`text-sm ${metric.color} font-medium`}>
                    {metric.change} vs last month
                  </p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <metric.icon className={`h-6 w-6 ${metric.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Monthly Revenue & Bookings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyRevenue}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="revenue" fill="#3B82F6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Weekly Occupancy Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={occupancyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="occupancy" stroke="#10B981" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Booking Sources</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={bookingSourceData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {bookingSourceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-4 space-y-2">
              {bookingSourceData.map((source, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: source.color }}
                    />
                    <span className="text-sm">{source.name}</span>
                  </div>
                  <Badge variant="secondary">{source.value}%</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Performance Insights</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <h4 className="font-medium text-green-800 mb-2">Peak Season Performance</h4>
              <p className="text-sm text-green-700">
                Your hotel is performing 15% above average for this time of year. 
                Consider implementing dynamic pricing strategies.
              </p>
            </div>
            
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="font-medium text-blue-800 mb-2">Booking Trends</h4>
              <p className="text-sm text-blue-700">
                Direct bookings have increased by 12% this quarter. 
                Your website optimization efforts are paying off.
              </p>
            </div>
            
            <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <h4 className="font-medium text-yellow-800 mb-2">Revenue Opportunity</h4>
              <p className="text-sm text-yellow-700">
                Weekend rates could be increased by 8-10% based on current demand patterns.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
