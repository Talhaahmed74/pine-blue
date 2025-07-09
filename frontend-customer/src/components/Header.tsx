"use client"

import { useState, useEffect } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { User, LogOut, Settings, Menu } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import LoginModal from "./LoginModal"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"

const Header = () => {
  const { user, logout } = useAuth()
  const [showLoginModal, setShowLoginModal] = useState(false)
  const navigate = useNavigate()

  // Listen for login/logout events
  useEffect(() => {
    const handleUserLoggedIn = (event: CustomEvent) => {
      console.log("🎉 User logged in event received:", event.detail)
      setShowLoginModal(false)
      // Force a re-render by updating a state
      setTimeout(() => {
        window.location.reload()
      }, 100)
    }

    const handleUserLoggedOut = () => {
      console.log("👋 User logged out event received")
      navigate("/")
    }

    window.addEventListener("userLoggedIn", handleUserLoggedIn as EventListener)
    window.addEventListener("userLoggedOut", handleUserLoggedOut)

    return () => {
      window.removeEventListener("userLoggedIn", handleUserLoggedIn as EventListener)
      window.removeEventListener("userLoggedOut", handleUserLoggedOut)
    }
  }, [navigate])

  const navLinks = [
    { to: "/", label: "Home" },
    { to: "/rooms", label: "Rooms" },
    { to: "/about", label: "About Us" },
    { to: "/contact", label: "Contact Us" },
  ]

  // Only show admin link if user is admin
  const isAdmin = user?.email === "hammad.switch@gmail.com"

  const handleLoginSuccess = () => {
    console.log("✅ Login success callback triggered")
    setShowLoginModal(false)
  }

  return (
    <>
      <header className="bg-white/95 backdrop-blur-sm shadow-sm border-b border-gray-100 sticky top-0 z-40">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-20">
            <Link to="/" className="flex items-center space-x-3">
              <img
                src="/lovable-uploads/logo.png"
                alt="Blue Pine Resort"
                className="h-12 w-auto"
                onError={(e) => {
                  // Fallback if image doesn't exist
                  e.currentTarget.style.display = "none"
                }}
              />
              
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-8">
              {navLinks.map(({ to, label }) => (
                <Link key={to} to={to} className="text-gray-700 hover:text-primary transition-colors font-medium">
                  {label}
                </Link>
              ))}
              {user && (
                <Link to="/dashboard" className="text-gray-700 hover:text-primary transition-colors font-medium">
                  My Bookings
                </Link>
              )}
              {isAdmin && (
                <Link to="/admin" className="text-gray-700 hover:text-primary transition-colors font-medium">
                  Admin
                </Link>
              )}
            </nav>

            <div className="flex items-center space-x-4">
              {/* Mobile Menu */}
              <Sheet>
                <SheetTrigger asChild className="md:hidden">
                  <Button variant="ghost" size="sm">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent>
                  <SheetHeader>
                    <SheetTitle>Menu</SheetTitle>
                  </SheetHeader>
                  <div className="flex flex-col space-y-4 mt-6">
                    {navLinks.map(({ to, label }) => (
                      <Link key={to} to={to} className="text-gray-700 hover:text-primary transition-colors py-2">
                        {label}
                      </Link>
                    ))}
                    {user && (
                      <Link to="/dashboard" className="text-gray-700 hover:text-primary transition-colors py-2">
                        My Bookings
                      </Link>
                    )}
                    {isAdmin && (
                      <Link to="/admin" className="text-gray-700 hover:text-primary transition-colors py-2">
                        Admin
                      </Link>
                    )}
                    {!user && (
                      <Button
                        variant="ghost"
                        onClick={() => setShowLoginModal(true)}
                        className="text-gray-700 hover:text-primary transition-colors py-2 justify-start"
                      >
                        Login / Signup
                      </Button>
                    )}
                  </div>
                </SheetContent>
              </Sheet>

              {/* Desktop User Menu */}
              <div className="hidden md:flex items-center space-x-4">
                {user ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <User className="h-4 w-4 mr-2" />
                        {user.name || user.email}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link to="/dashboard" className="flex items-center">
                          <Settings className="h-4 w-4 mr-2" />
                          Dashboard
                        </Link>
                      </DropdownMenuItem>
                      {isAdmin && (
                        <DropdownMenuItem asChild>
                          <Link to="/admin" className="flex items-center">
                            <Settings className="h-4 w-4 mr-2" />
                            Admin Panel
                          </Link>
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={logout}>
                        <LogOut className="h-4 w-4 mr-2" />
                        Sign Out
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <>
                    <Button variant="ghost" size="sm" onClick={() => setShowLoginModal(true)}>
                      <User className="h-4 w-4 mr-2" />
                      Login
                    </Button>
                    <Link to="/rooms">
                      <Button size="sm" className="bg-primary hover:bg-primary/90">
                        Book Now
                      </Button>
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Login Modal */}
      <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} onSuccess={handleLoginSuccess} />
    </>
  )
}

export default Header
