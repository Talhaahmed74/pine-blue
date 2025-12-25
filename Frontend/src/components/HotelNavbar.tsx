import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Settings, User, LogOut, Loader2 } from "lucide-react"
import { useState, useEffect } from "react"
import { billSettingsApi } from "@/apis/BillSetting_api"
import { notificationsApi } from "@/apis/notifications_api"
import { useNotifications } from "@/hooks/useNotifications"
import { toast } from "sonner"
import { NotificationsPanel } from '@/components/admin/NotificationsPanel'

interface HotelNavbarProps {
  onLogout: () => void
}

export const HotelNavbar = ({ onLogout }: HotelNavbarProps) => {
  const [billSettings, setBillSettings] = useState({
    discount: "",
    vat: "",
  })
  const [isBillingSettingsOpen, setIsBillingSettingsOpen] = useState(false)
  const [isNotificationSettingsOpen, setIsNotificationSettingsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [notificationSettings, setNotificationSettings] = useState({
    notifications_enabled: true,
  })
  const [settingsLoading, setSettingsLoading] = useState(false)
  const [settingsSaving, setSettingsSaving] = useState(false)
  
  const {
    notifications,
    unreadCount,
    isConnected,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotifications()

  // Load billing settings when dialog opens
  useEffect(() => {
    if (isBillingSettingsOpen) {
      loadBillingSettings()
    }
  }, [isBillingSettingsOpen])

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

  const loadNotificationSettings = async () => {
    setSettingsLoading(true)
    try {
      const response = await notificationsApi.getSettings()
      if (response.success) {
        setNotificationSettings({
          notifications_enabled: response.data.notifications_enabled,
        })
      }
    } catch (error) {
      console.error("Error loading notification settings:", error)
      toast.error("Failed to load notification settings")
    } finally {
      setSettingsLoading(false)
    }
  }

  const handleSaveBillingSettings = async () => {
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
        setIsBillingSettingsOpen(false)
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

  const handleSaveNotificationSettings = async () => {
    setSettingsSaving(true)
    try {
      const response = await notificationsApi.updateSettings(notificationSettings)

      if (response.success) {
        toast.success("Notification settings updated successfully!")
        setIsNotificationSettingsOpen(false)
        // Reload the page to apply settings
        window.location.reload()
      } else {
        toast.error("Failed to update notification settings")
      }
    } catch (error) {
      console.error("Error saving notification settings:", error)
      toast.error("Failed to save notification settings")
    } finally {
      setSettingsSaving(false)
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
              <span className="text-lg sm:text-xl font-bold text-blue-800 truncate">Admin</span>
              <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200 hidden xs:inline-flex">Premium</Badge>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            {/* Notifications Panel */}
            <NotificationsPanel
              unreadCount={unreadCount}
              isConnected={isConnected}
              onMarkAsRead={markAsRead}
              onMarkAllAsRead={markAllAsRead}
              onDelete={deleteNotification}
              liveNotifications={notifications}
            />

            {/* Settings Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="hidden sm:flex bg-transparent">
                  <Settings className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {/* Billing Settings */}
                <Dialog open={isBillingSettingsOpen} onOpenChange={setIsBillingSettingsOpen}>
                  <DialogTrigger asChild>
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                      Configure Billing Settings
                    </DropdownMenuItem>
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
                          <Button variant="outline" onClick={() => setIsBillingSettingsOpen(false)} disabled={saving}>
                            Cancel
                          </Button>
                          <Button onClick={handleSaveBillingSettings} disabled={saving}>
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

                <DropdownMenuSeparator />

                {/* Notification Settings */}
                <Dialog open={isNotificationSettingsOpen} onOpenChange={setIsNotificationSettingsOpen}>
                  <DialogTrigger asChild>
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                      Notification Settings
                    </DropdownMenuItem>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                      <DialogTitle>Notification Settings Configuration</DialogTitle>
                    </DialogHeader>

                    {settingsLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin" />
                        <span className="ml-2">Loading settings...</span>
                      </div>
                    ) : (
                      <>
                        <div className="grid gap-4 py-4">
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="notifications" className="text-right">
                              Enable Notifications
                            </Label>
                            <div className="col-span-3">
                              <button
                                id="notifications"
                                type="button"
                                onClick={() =>
                                  setNotificationSettings({
                                    ...notificationSettings,
                                    notifications_enabled: !notificationSettings.notifications_enabled,
                                  })
                                }
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 ${
                                  notificationSettings.notifications_enabled ? 'bg-black' : 'bg-gray-200'
                                }`}
                              >
                                <span
                                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                    notificationSettings.notifications_enabled ? 'translate-x-6' : 'translate-x-1'
                                  }`}
                                />
                              </button>
                              <p className="text-xs text-gray-500 mt-2">
                                {notificationSettings.notifications_enabled
                                  ? 'Notifications are enabled'
                                  : 'Notifications are disabled'}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            onClick={() => setIsNotificationSettingsOpen(false)}
                            disabled={settingsSaving}
                          >
                            Cancel
                          </Button>
                          <Button onClick={handleSaveNotificationSettings} disabled={settingsSaving}>
                            {settingsSaving ? (
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