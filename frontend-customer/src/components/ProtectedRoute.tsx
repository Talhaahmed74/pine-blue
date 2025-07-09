"use client"

import type React from "react"

import { useAuth } from "@/contexts/AuthContext"
import { Navigate } from "react-router-dom"
import { useEffect, useState } from "react"
import { toast } from "sonner"

interface ProtectedRouteProps {
  children: React.ReactNode
  requireAdmin?: boolean
}

const ProtectedRoute = ({ children, requireAdmin = false }: ProtectedRouteProps) => {
  const { user, loading } = useAuth()
  const [hasShownLoginPrompt, setHasShownLoginPrompt] = useState(false)

  useEffect(() => {
    // Show login prompt when user is not authenticated and we haven't shown it yet
    if (!loading && !user && !hasShownLoginPrompt) {
      toast.error("Please login to access this page")
      setHasShownLoginPrompt(true)
    }
  }, [user, loading, hasShownLoginPrompt])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    // Redirect to home instead of /auth - login modal will be triggered from header
    return <Navigate to="/" replace />
  }

  // For admin routes, check if user email is admin
  if (requireAdmin && user.email !== "hammad.switch@gmail.com") {
    toast.error("Admin access required")
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}

export default ProtectedRoute
