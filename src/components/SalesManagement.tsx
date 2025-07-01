
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, DollarSign, Calendar, User, Package } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export const SalesManagement = () => {
  const { toast } = useToast();
  const [isNewSaleOpen, setIsNewSaleOpen] = useState(false);

  const sales = [
    {
      id: "INV-001",
      date: "2024-01-15",
      customer: "Sarah Johnson",
      items: [
        { name: "Rose Bush Red", quantity: 3, price: 29.99 },
        { name: "Garden Soil", quantity: 2, price: 12.99 }
      ],
      total: 115.95,
      status: "Paid",
      paymentMethod: "Credit Card"
    },
    {
      id: "INV-002",
      date: "2024-01-15",
      customer: "Mike Chen",
      items: [
        { name: "Herb Garden Kit", quantity: 1, price: 45.50 }
      ],
      total: 45.50,
      status: "Paid",
      paymentMethod: "Cash"
    },
    {
      id: "INV-003",
      date: "2024-01-14",
      customer: "Emma Davis",
      items: [
        { name: "Lavender Plant", quantity: 2, price: 17.99 }
      ],
      total: 35.98,
      status: "Pending",
      paymentMethod: "Check"
    },
    {
      id: "INV-004",
      date: "2024-01-14",
      customer: "John Smith",
      items: [
        { name: "Japanese Maple", quantity: 1, price: 89.99 },
        { name: "Fertilizer", quantity: 1, price: 15.99 }
      ],
      total: 105.98,
      status: "Paid",
      paymentMethod: "Credit Card"
    }
  ];

  const handleNewSale = () => {
    toast({
      title: "Sale Recorded",
      description: "New sale has been added successfully",
    });
    setIsNewSaleOpen(false);
  };

  const getStatusBadge = (status: string) => {
    if (status === "Paid") {
      return <Badge className="bg-green-100 text-green-800">Paid</Badge>;
    } else if (status === "Pending") {
      return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
    } else {
      return <Badge className="bg-red-100 text-red-800">Overdue</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-green-800">Sales Management</h2>
          <p className="text-green-600">Track and manage your sales transactions</p>
        </div>
        <Dialog open={isNewSaleOpen} onOpenChange={setIsNewSaleOpen}>
          <DialogTrigger asChild>
            <Button className="bg-green-600 hover:bg-green-700">
              <Plus className="h-4 w-4 mr-2" />
              New Sale
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[525px]">
            <DialogHeader>
              <DialogTitle>Record New Sale</DialogTitle>
              <DialogDescription>
                Enter the details for this sale transaction.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="customer" className="text-right">Customer</Label>
                <Select>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select customer" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sarah">Sarah Johnson</SelectItem>
                    <SelectItem value="mike">Mike Chen</SelectItem>
                    <SelectItem value="emma">Emma Davis</SelectItem>
                    <SelectItem value="john">John Smith</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="payment" className="text-right">Payment Method</Label>
                <Select>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select payment method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="card">Credit Card</SelectItem>
                    <SelectItem value="check">Check</SelectItem>
                    <SelectItem value="bank">Bank Transfer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="total" className="text-right">Total Amount</Label>
                <Input id="total" type="number" step="0.01" className="col-span-3" placeholder="0.00" />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleNewSale} className="bg-green-600 hover:bg-green-700">
                Record Sale
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="shadow-lg border-green-100">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Sales</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700">$247.93</div>
            <p className="text-xs text-green-600">+12% from yesterday</p>
          </CardContent>
        </Card>
        
        <Card className="shadow-lg border-green-100">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <Calendar className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700">$3,247.50</div>
            <p className="text-xs text-blue-600">+8% from last month</p>
          </CardContent>
        </Card>
        
        <Card className="shadow-lg border-green-100">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Payments</CardTitle>
            <Package className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-700">$35.98</div>
            <p className="text-xs text-yellow-600">1 invoice pending</p>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-green-600" />
            Recent Sales
          </CardTitle>
          <CardDescription>
            View and manage your recent sales transactions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sales.map((sale) => (
                <TableRow key={sale.id}>
                  <TableCell className="font-medium">{sale.id}</TableCell>
                  <TableCell>{sale.date}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-gray-500" />
                      {sale.customer}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {sale.items.map((item, index) => (
                        <div key={index} className="mb-1">
                          {item.quantity}x {item.name}
                        </div>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="font-semibold text-green-600">
                    ${sale.total.toFixed(2)}
                  </TableCell>
                  <TableCell>{sale.paymentMethod}</TableCell>
                  <TableCell>{getStatusBadge(sale.status)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
