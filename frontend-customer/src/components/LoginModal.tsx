"use client"

import type React from "react"
import type { ReactElement } from "react"
import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/contexts/AuthContext"
import { Mail, Lock, AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface LoginModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export default function LoginModal({ isOpen, onClose, onSuccess }: LoginModalProps): ReactElement {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const { login } = useAuth()
  
  // Pre-fill demo credentials
  const fillDemoCredentials = () => {
    setEmail("customer@hotel.com")
    setPassword("password123")
    setError("")
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      console.log("🔐 Submitting login form...")
      const success = await login(email, password)
      if (success) {
        console.log("✅ Login successful, closing modal")
        onClose()
        onSuccess?.()
        setEmail("")
        setPassword("")
        setError("")
      }
    } catch (err) {
      console.error("❌ Login submission error:", err)
      setError("Login failed. Please check your credentials and try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setEmail("")
    setPassword("")
    setError("")
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Login to Book Room</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div>
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10"
                placeholder="Enter your email"
                required
                disabled={loading}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10"
                placeholder="Enter your password"
                required
                disabled={loading}
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button type="submit" className="flex-1" disabled={loading}>
              {loading ? "Logging in..." : "Login"}
            </Button>
            <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
              Cancel
            </Button>
          </div>
        </form>

        <div className="space-y-2">
          <p className="text-sm text-gray-600 text-center">Demo credentials:</p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={fillDemoCredentials}
            className="w-full text-blue-600 hover:text-blue-700"
            disabled={loading}
          >
            Use Demo: customer@hotel.com / password123
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
