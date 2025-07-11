"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Bell, Settings, User, LogOut, Loader2 } from "lucide-react"
import { useState, useEffect } from "react"
import { billSettingsApi } from "@/apis/BillSetting_api"
import { toast } from "sonner"

interface HotelNavbarProps {
  onLogout: () => void
}

export const HotelNavbar = ({ onLogout }: HotelNavbarProps) => {
  const [billSettings, setBillSettings] = useState({
    discount: "",
    vat: "",
  })
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  
  // Load current billing settings when dialog opens
  useEffect(() => {
    if (isSettingsOpen) {
      loadBillingSettings()
    }
  }, [isSettingsOpen])

  const loadBillingSettings = async () => {
    setLoading(true)
    try {
      const response = await billSettingsApi.getBillingSettings()
      if (response.success) {
        setBillSettings({
          discount: response.data.discount.toString(),
          vat: response.data.vat.toString(),
        })
      }
    } catch (error) {
      console.error("Error loading billing settings:", error)
      toast.error("Failed to load billing settings")
    } finally {
      setLoading(false)
    }
  }

  const handleSaveChanges = async () => {
    if (!billSettings.discount || !billSettings.vat) {
      toast.error("Please fill in both discount and VAT values")
      return
    }

    const discount = Number.parseFloat(billSettings.discount)
    const vat = Number.parseFloat(billSettings.vat)

    if (isNaN(discount) || isNaN(vat)) {
      toast.error("Please enter valid numbers for discount and VAT")
      return
    }

    if (discount < 0 || discount > 100) {
      toast.error("Discount must be between 0 and 100")
      return
    }

    if (vat < 0 || vat > 100) {
      toast.error("VAT must be between 0 and 100")
      return
    }

    setSaving(true)
    try {
      const response = await billSettingsApi.updateBillingSettings({
        vat: vat,
        discount: discount,
      })

      if (response.success) {
        toast.success("Billing settings updated successfully!")
        setIsSettingsOpen(false)
      } else {
        toast.error("Failed to update billing settings")
      }
    } catch (error) {
      console.error("Error saving billing settings:", error)
      toast.error("Failed to save billing settings")
    } finally {
      setSaving(false)
    }
  }

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
              <span className="text-lg sm:text-xl font-bold text-blue-800 truncate">Blue Pines Online</span>
              <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200 hidden xs:inline-flex">Premium</Badge>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <Button variant="outline" size="sm" className="relative hidden sm:flex bg-transparent">
              <Bell className="h-4 w-4" />
              <Badge className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
                5
              </Badge>
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="hidden sm:flex bg-transparent">
                  <Settings className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
                  <DialogTrigger asChild>
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>Configure Billing Settings</DropdownMenuItem>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                      <DialogTitle>Billing Settings Configuration</DialogTitle>
                    </DialogHeader>

                    {loading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin" />
                        <span className="ml-2">Loading settings...</span>
                      </div>
                    ) : (
                      <>
                        <div className="grid gap-4 py-4">
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="discount" className="text-right">
                              Discount (%)
                            </Label>
                            <Input
                              id="discount"
                              type="number"
                              min="0"
                              max="100"
                              step="0.01"
                              value={billSettings.discount}
                              onChange={(e) => setBillSettings({ ...billSettings, discount: e.target.value })}
                              className="col-span-3"
                              placeholder="Enter discount percentage"
                            />
                          </div>
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="vat" className="text-right">
                              VAT (%)
                            </Label>
                            <Input
                              id="vat"
                              type="number"
                              min="0"
                              max="100"
                              step="0.01"
                              value={billSettings.vat}
                              onChange={(e) => setBillSettings({ ...billSettings, vat: e.target.value })}
                              className="col-span-3"
                              placeholder="Enter VAT percentage"
                            />
                          </div>
                        </div>

                        <div className="flex justify-end gap-2">
                          <Button variant="outline" onClick={() => setIsSettingsOpen(false)} disabled={saving}>
                            Cancel
                          </Button>
                          <Button onClick={handleSaveChanges} disabled={saving}>
                            {saving ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                Saving...
                              </>
                            ) : (
                              "Save Changes"
                            )}
                          </Button>
                        </div>
                      </>
                    )}
                  </DialogContent>
                </Dialog>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button variant="outline" size="sm" className="hidden sm:flex bg-transparent">
              <User className="h-4 w-4" />
              <span className="hidden md:inline">Admin</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={onLogout}
              className="text-red-600 hover:text-red-700 hover:bg-red-50 flex-shrink-0 bg-transparent"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline ml-1">Logout</span>
            </Button>
          </div>
        </div>
      </div>
    </nav>
  )
}
