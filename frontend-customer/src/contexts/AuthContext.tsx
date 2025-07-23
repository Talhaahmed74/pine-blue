"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import { toast } from "sonner"

interface User {
  id: number
  email: string
  name: string
  phone?: string
}

interface AuthContextType {
  user: User | null
  login: (email: string, password: string) => Promise<boolean>
  logout: () => void
  loading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.replace(/\/+$/, "");
  useEffect(() => {
    const savedUser = localStorage.getItem("hotel_user")
  
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser)
  
        // 🔐 Check with backend if user still exists
        fetch(`${API_BASE_URL}/user/${parsedUser.id}`)
          .then((res) => {
            if (!res.ok) throw new Error("User not valid anymore")
            return res.json()
          })
          .then((data) => {
            setUser(data)
            console.log("✅ Verified and restored user from backend:", data)
          })
          .catch((err) => {
            console.warn("❌ Saved user not valid anymore:", err)
            localStorage.removeItem("hotel_user")
            setUser(null)
          })
          .finally(() => setLoading(false))
      } catch (error) {
        console.error("❌ Error parsing saved user:", error)
        localStorage.removeItem("hotel_user")
        setUser(null)
        setLoading(false)
      }
    } else {
      setLoading(false)
    }
  }, [])  
  
  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      console.log("🔐 Starting login process...")
      console.log("📧 Email:", email)

      // Test if FastAPI server is running
      try {
        const healthResponse = await fetch(`${API_BASE_URL}/health`, {
          method: "GET",
        })
        console.log("🏥 Health check status:", healthResponse.status)
      } catch (healthError) {
        console.error("🚨 FastAPI server not reachable:", healthError)
        toast.error("Cannot connect to server. Please ensure FastAPI is running on port 8000.")
        return false
      }

      const response = await fetch(`${API_BASE_URL}/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          email: email.trim(),
          password: password,
        }),
      })

      console.log("📡 Login response status:", response.status)

      const responseText = await response.text()
      console.log("📄 Raw response:", responseText)

      if (!response.ok) {
        let errorMessage = "Login failed"
        try {
          const error = JSON.parse(responseText)
          errorMessage = error.detail || error.message || errorMessage
          console.error("❌ Login error response:", error)
        } catch (parseError) {
          console.error("❌ Error parsing error response:", parseError)
          errorMessage = `Server error (${response.status}): ${responseText}`
        }
        toast.error(errorMessage)
        return false
      }

      let data
      try {
        data = JSON.parse(responseText)
      } catch (parseError) {
        console.error("❌ Error parsing success response:", parseError)
        toast.error("Invalid response from server")
        return false
      }

      console.log("✅ Login response data:", data)

      if (data.success) {
        const userData = {
          id: data.user_id,
          email: data.email,
          name: data.name,
        }

        console.log("👤 Setting user data:", userData)
        setUser(userData)
        localStorage.setItem("hotel_user", JSON.stringify(userData))
        toast.success("Login successful!")

        // Trigger a custom event for components to listen to
        window.dispatchEvent(new CustomEvent("userLoggedIn", { detail: userData }))

        return true
      } else {
        toast.error(data.message || "Login failed")
        return false
      }
    } catch (error) {
      console.error("🚨 Network/Login error:", error)
      if (error instanceof TypeError && error.message.includes("fetch")) {
        toast.error("Cannot connect to server. Please check if FastAPI is running.")
      } else {
        toast.error("Login failed. Please try again.")
      }
      return false
    }
  }

  const logout = () => {
    console.log("🚪 Logging out user")
    setUser(null)
    localStorage.removeItem("hotel_user")
    toast.success("Logged out successfully")

    // Trigger a custom event for components to listen to
    window.dispatchEvent(new CustomEvent("userLoggedOut"))
  }

  return <AuthContext.Provider value={{ user, login, logout, loading }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
