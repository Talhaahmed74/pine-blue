
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Search, Plus, Edit, Trash2, Leaf, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export const PlantInventory = () => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  
  const plants = [
    {
      id: 1,
      name: "Rose Bush Red",
      category: "Flowers",
      quantity: 25,
      price: 29.99,
      cost: 15.50,
      supplier: "Garden Supply Co",
      lowStockThreshold: 10,
      description: "Beautiful red roses perfect for gardens"
    },
    {
      id: 2,
      name: "Lavender Plant",
      category: "Herbs",
      quantity: 12,
      price: 17.99,
      cost: 8.75,
      supplier: "Herb Heaven",
      lowStockThreshold: 15,
      description: "Fragrant lavender for aromatherapy and cooking"
    },
    {
      id: 3,
      name: "Tomato Seedlings",
      category: "Vegetables",
      quantity: 8,
      price: 3.99,
      cost: 1.50,
      supplier: "Veggie World",
      lowStockThreshold: 20,
      description: "Organic tomato seedlings ready for transplant"
    },
    {
      id: 4,
      name: "Peace Lily",
      category: "Indoor Plants",
      quantity: 18,
      price: 24.99,
      cost: 12.00,
      supplier: "Indoor Gardens",
      lowStockThreshold: 8,
      description: "Low-light indoor plant with white flowers"
    },
    {
      id: 5,
      name: "Japanese Maple",
      category: "Trees",
      quantity: 6,
      price: 89.99,
      cost: 45.00,
      supplier: "Tree Masters",
      lowStockThreshold: 3,
      description: "Ornamental tree with stunning fall colors"
    }
  ];

  const filteredPlants = plants.filter(plant =>
    plant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    plant.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStockStatus = (quantity: number, threshold: number) => {
    if (quantity === 0) return { status: "Out of Stock", color: "bg-red-100 text-red-800", icon: AlertTriangle };
    if (quantity <= threshold) return { status: "Low Stock", color: "bg-yellow-100 text-yellow-800", icon: AlertTriangle };
    return { status: "In Stock", color: "bg-green-100 text-green-800", icon: Leaf };
  };

  const handleAddPlant = () => {
    toast({
      title: "Plant Added Successfully",
      description: "New plant has been added to inventory",
    });
    setIsAddDialogOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-green-800">Plant Inventory</h2>
          <p className="text-green-600">Manage your plant stock and pricing</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-green-600 hover:bg-green-700">
              <Plus className="h-4 w-4 mr-2" />
              Add New Plant
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[525px]">
            <DialogHeader>
              <DialogTitle>Add New Plant</DialogTitle>
              <DialogDescription>
                Enter the details for the new plant in your inventory.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">Name</Label>
                <Input id="name" className="col-span-3" placeholder="Plant name" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="category" className="text-right">Category</Label>
                <Select>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="flowers">Flowers</SelectItem>
                    <SelectItem value="herbs">Herbs</SelectItem>
                    <SelectItem value="vegetables">Vegetables</SelectItem>
                    <SelectItem value="indoor">Indoor Plants</SelectItem>
                    <SelectItem value="trees">Trees</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="quantity" className="text-right">Quantity</Label>
                <Input id="quantity" type="number" className="col-span-3" placeholder="0" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="price" className="text-right">Sale Price</Label>
                <Input id="price" type="number" step="0.01" className="col-span-3" placeholder="0.00" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="cost" className="text-right">Cost</Label>
                <Input id="cost" type="number" step="0.01" className="col-span-3" placeholder="0.00" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="threshold" className="text-right">Low Stock Alert</Label>
                <Input id="threshold" type="number" className="col-span-3" placeholder="10" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="description" className="text-right">Description</Label>
                <Textarea id="description" className="col-span-3" placeholder="Plant description" />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleAddPlant} className="bg-green-600 hover:bg-green-700">
                Add Plant
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search plants..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPlants.map((plant) => {
          const stockStatus = getStockStatus(plant.quantity, plant.lowStockThreshold);
          return (
            <Card key={plant.id} className="shadow-lg hover:shadow-xl transition-shadow duration-300 border-green-100">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg text-green-800">{plant.name}</CardTitle>
                    <CardDescription className="text-green-600">{plant.category}</CardDescription>
                  </div>
                  <Badge className={stockStatus.color}>
                    <stockStatus.icon className="h-3 h-3 mr-1" />
                    {stockStatus.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Quantity:</span>
                    <p className="font-semibold text-lg">{plant.quantity}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Price:</span>
                    <p className="font-semibold text-lg text-green-600">${plant.price}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Cost:</span>
                    <p className="font-semibold">${plant.cost}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Profit:</span>
                    <p className="font-semibold text-green-600">${(plant.price - plant.cost).toFixed(2)}</p>
                  </div>
                </div>
                
                <div>
                  <span className="text-gray-600 text-sm">Supplier:</span>
                  <p className="font-medium">{plant.supplier}</p>
                </div>
                
                <p className="text-sm text-gray-600">{plant.description}</p>
                
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" size="sm" className="flex-1">
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
