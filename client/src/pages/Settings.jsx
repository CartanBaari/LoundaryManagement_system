import { useEffect, useState } from "react"
import { Lock, Bell, Save, Settings as SettingsIcon } from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/context/AuthContext"
import { api } from "@/services/api"
import PageHeader from "@/components/shared/PageHeader"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { getInitials } from "@/lib/utils"

export default function Settings() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [settings, setSettings] = useState({
    dailyOrderLimit: 20,
    enableNotifications: true,
    systemName: "LaundryHub",
  })
  const [formData, setFormData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await api.get("/settings")
        if (response.data?.settings) setSettings(response.data.settings)
      } catch {
        console.log("Failed to load settings")
      }
    }
    loadSettings()
  }, [])

  const handleSaveSettings = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const response = await api.put("/settings", {
        ...settings,
        dailyOrderLimit: Number(settings.dailyOrderLimit),
      })
      if (response.data?.settings) setSettings(response.data.settings)
      toast.success("Settings updated successfully")
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update settings")
    } finally {
      setLoading(false)
    }
  }

  const handleChangePassword = async (e) => {
    e.preventDefault()
    if (!formData.currentPassword || !formData.newPassword) {
      toast.error("Please fill in all password fields")
      return
    }
    if (formData.newPassword !== formData.confirmPassword) {
      toast.error("Passwords do not match")
      return
    }
    if (formData.newPassword.length < 6) {
      toast.error("New password must be at least 6 characters")
      return
    }

    setLoading(true)
    try {
      await api.post("/auth/change-password", {
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword,
      })
      toast.success("Password changed successfully")
      setFormData({ currentPassword: "", newPassword: "", confirmPassword: "" })
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to change password")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Settings"
        description="Manage your account and system preferences."
        icon={SettingsIcon}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardContent className="flex flex-col items-center p-6 text-center">
            <Avatar className="h-20 w-20">
              <AvatarFallback className="bg-primary text-xl">{getInitials(user?.name)}</AvatarFallback>
            </Avatar>
            <h3 className="mt-4 text-lg font-bold">{user?.name}</h3>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
            <Badge className="mt-2 capitalize">{user?.role}</Badge>
            <Separator className="my-4" />
            <div className="w-full space-y-3 text-left text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Phone</span>
                <span className="font-medium">{user?.phone || "N/A"}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6 lg:col-span-2">
          {user?.role === "admin" && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-primary/10">
                    <Bell className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle>System Settings</CardTitle>
                    <CardDescription>Configure system-wide preferences</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSaveSettings} className="space-y-5">
                  <div className="space-y-2">
                    <Label>System Name</Label>
                    <Input
                      value={settings.systemName}
                      onChange={(e) => setSettings((p) => ({ ...p, systemName: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Daily Order Limit</Label>
                    <div className="flex items-center gap-3">
                      <Input
                        type="number"
                        min="1"
                        max="100"
                        className="w-32"
                        value={settings.dailyOrderLimit}
                        onChange={(e) => setSettings((p) => ({ ...p, dailyOrderLimit: e.target.value }))}
                      />
                      <span className="text-sm text-muted-foreground">non-urgent orders per day</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Urgent orders are not counted toward this limit. When the limit is reached, new non-urgent orders are automatically scheduled for the next day.
                    </p>
                  </div>
                  <div className="flex items-center justify-between rounded-[10px] border border-border p-4">
                    <div>
                      <p className="font-semibold">Enable Notifications</p>
                      <p className="text-sm text-muted-foreground">Send order status updates to users</p>
                    </div>
                    <Switch
                      checked={settings.enableNotifications}
                      onCheckedChange={(checked) => setSettings((p) => ({ ...p, enableNotifications: checked }))}
                    />
                  </div>
                  <Button type="submit" loading={loading}>
                    <Save className="mr-2 h-4 w-4" />Save Settings
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-primary/10">
                  <Lock className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle>Change Password</CardTitle>
                  <CardDescription>Update your account password</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div className="space-y-2">
                  <Label>Current Password</Label>
                  <Input
                    type="password"
                    value={formData.currentPassword}
                    onChange={(e) => setFormData((p) => ({ ...p, currentPassword: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>New Password</Label>
                  <Input
                    type="password"
                    value={formData.newPassword}
                    onChange={(e) => setFormData((p) => ({ ...p, newPassword: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Confirm Password</Label>
                  <Input
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData((p) => ({ ...p, confirmPassword: e.target.value }))}
                  />
                </div>
                <Button type="submit" loading={loading}>Update Password</Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
