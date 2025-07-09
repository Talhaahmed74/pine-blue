"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "react-router-dom"
import Header from "@/components/Header"
import HeroSection from "@/components/HeroSection"
import WhyChooseSection from "@/components/WhyChooseSection"
import FeaturedRooms from "@/components/FeaturedRooms"
import ServicesSection from "@/components/ServicesSection"
import MountainSection from "@/components/MountainSection"
import TestimonialsSection from "@/components/TestimonialsSection"
import Footer from "@/components/Footer"
import LoginModal from "@/components/LoginModal"
import { useAuth } from "@/contexts/AuthContext"

const Home = () => {
  const { user } = useAuth()
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [searchParams] = useSearchParams()

  useEffect(() => {
    // Check if we need to show login modal (e.g., when redirected from protected route)
    const needsLogin = searchParams.get("login") === "true"
    if (needsLogin && !user) {
      setShowLoginModal(true)
    }
  }, [searchParams, user])

  // Listen for login prompts from other components
  useEffect(() => {
    const handleShowLogin = () => {
      if (!user) {
        setShowLoginModal(true)
      }
    }

    window.addEventListener("showLoginModal", handleShowLogin)
    return () => window.removeEventListener("showLoginModal", handleShowLogin)
  }, [user])

  const handleLoginSuccess = () => {
    setShowLoginModal(false)
    // Remove login parameter from URL if present
    if (searchParams.get("login")) {
      window.history.replaceState({}, "", window.location.pathname)
    }
  }

  return (
    <div className="min-h-screen">
      <Header />
      <HeroSection />
      <WhyChooseSection />
      <FeaturedRooms />
      <ServicesSection />
      <MountainSection />
      <TestimonialsSection />
      <Footer />

      {/* Login Modal */}
      <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} onSuccess={handleLoginSuccess} />
    </div>
  )
}

export default Home
