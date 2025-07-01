
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Search, Plus, User, Mail, Phone, MapPin, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export const CustomerManagement = () => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);

  const customers = [
    {
      id: 1,
      name: "Sarah Johnson",
      email: "sarah.johnson@email.com",
      phone: "(555) 123-4567",
      address: "123 Garden Lane, Green City, GC 12345",
      joinDate: "2023-08-15",
      totalSpent: 347.85,
      lastPurchase: "2024-01-15",
      status: "Active",
      notes: "Loves rose bushes and garden accessories"
    },
    {
      id: 2,
      name: "Mike Chen",
      email: "mike.chen@email.com",
      phone: "(555) 234-5678",
      address: "456 Bloom Street, Plant Town, PT 23456",
      joinDate: "2023-11-22",
      totalSpent: 189.50,
      lastPurchase: "2024-01-15",
      status: "Active",
      notes: "Interested in herb gardens and organic products"
    },
    {
      id: 3,
      name: "Emma Davis",
      email: "emma.davis@email.com",
      phone: "(555) 345-6789",
      address: "789 Flower Ave, Blossom City, BC 34567",
      joinDate: "2023-06-10",
      totalSpent: 523.20,
      lastPurchase: "2024-01-14",
      status: "VIP",
      notes: "Regular customer, prefers lavender and aromatic plants"
    },
    {
      id: 4,
      name: "John Smith",
      email: "john.smith@email.com",
      phone: "(555) 456-7890",
      address: "321 Tree Road, Forest Hill, FH 45678",
      joinDate: "2023-03-05",
      totalSpent: 892.75,
      lastPurchase: "2024-01-14",
      status: "VIP",
      notes: "Landscaper, bulk orders for commercial projects"
    },
    {
      id: 5,
      name: "Lisa Brown",
      email: "lisa.brown@email.com",
      phone: "(555) 567-8901",
      address: "654 Petal Drive, Meadow View, MV 56789",
      joinDate: "2023-12-03",
      totalSpent: 67.45,
      lastPurchase: "2023-12-15",
      status: "Inactive",
      notes: "New customer, interested in indoor plants"
    }
  ];

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    if (status === "VIP") {
      return <Badge className="bg-purple-100 text-purple-800">VIP</Badge>;
    } else if (status === "Active") {
      return <Badge className="bg-green-100 text-green-800">Active</Badge>;
    } else {
      return <Badge className="bg-gray-100 text-gray-800">Inactive</Badge>;
    }
  };

  const handleAddCustomer = () => {
    toast({
      title: "Customer Added",
      description: "New customer has been added successfully",
    });
    setIsAddCustomerOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-green-800">Customer Management</h2>
          <p className="text-green-600">Manage your customer relationships and data</p>
        </div>
        <Dialog open={isAddCustomerOpen} onOpenChange={setIsAddCustomerOpen}>
          <DialogTrigger asChild>
            <Button className="bg-green-600 hover:bg-green-700">
              <Plus className="h-4 w-4 mr-2" />
              Add Customer
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[525px]">
            <DialogHeader>
              <DialogTitle>Add New Customer</DialogTitle>
              <DialogDescription>
                Enter the customer's information to add them to your database.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">Full Name</Label>
                <Input id="name" className="col-span-3" placeholder="Customer name" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="email" className="text-right">Email</Label>
                <Input id="email" type="email" className="col-span-3" placeholder="customer@email.com" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="phone" className="text-right">Phone</Label>
                <Input id="phone" className="col-span-3" placeholder="(555) 123-4567" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="address" className="text-right">Address</Label>
                <Textarea id="address" className="col-span-3" placeholder="Full address" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="notes" className="text-right">Notes</Label>
                <Textarea id="notes" className="col-span-3" placeholder="Customer preferences, notes..." />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleAddCustomer} className="bg-green-600 hover:bg-green-700">
                Add Customer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search customers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredCustomers.map((customer) => (
          <Card key={customer.id} className="shadow-lg hover:shadow-xl transition-shadow duration-300 border-green-100">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg text-green-800 flex items-center gap-2">
                    <User className="h-5 w-5" />
                    {customer.name}
                  </CardTitle>
                  <CardDescription className="text-green-600">
                    Member since {new Date(customer.joinDate).toLocaleDateString()}
                  </CardDescription>
                </div>
                {getStatusBadge(customer.status)}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-gray-500" />
                  <span className="text-gray-700">{customer.email}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-gray-500" />
                  <span className="text-gray-700">{customer.phone}</span>
                </div>
                <div className="flex items-start gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-gray-500 mt-0.5" />
                  <span className="text-gray-700">{customer.address}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                <div>
                  <span className="text-xs text-gray-500">Total Spent</span>
                  <p className="font-semibold text-green-600">${customer.totalSpent.toFixed(2)}</p>
                </div>
                <div>
                  <span className="text-xs text-gray-500">Last Purchase</span>
                  <p className="font-semibold">{new Date(customer.lastPurchase).toLocaleDateString()}</p>
                </div>
              </div>

              {customer.notes && (
                <div className="pt-2 border-t">
                  <span className="text-xs text-gray-500">Notes</span>
                  <p className="text-sm text-gray-700 mt-1">{customer.notes}</p>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button variant="outline" size="sm" className="flex-1">
                  View Details
                </Button>
                <Button variant="outline" size="sm" className="flex-1">
                  Edit
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
