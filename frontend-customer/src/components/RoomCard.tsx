"use client"

import { useState } from "react"
import { Users, Ruler, CheckCircle, XCircle } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "@/contexts/AuthContext"
import LoginModal from "./LoginModal"

interface RoomCardProps {
  id: number | string
  name: string
  price: number
  image: string
  capacity: number
  children?: number
  size?: string
  isAvailable?: boolean
  maxAdults?: number
  maxChildren?: number
}

const RoomCard = ({
  id,
  name,
  price,
  image,
  capacity = 2,
  children = 1,
  size = "90 ft²",
  isAvailable = true,
  maxAdults,
  maxChildren,
}: RoomCardProps) => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [showLoginModal, setShowLoginModal] = useState(false)

  const handleBookClick = () => {
    if (!isAvailable) return

    if (!user) {
      setShowLoginModal(true)
      return
    }

    navigate(`/book/${id}`)
  }

  const handleLoginSuccess = () => {
    setShowLoginModal(false)
    // Navigate after successful login
    setTimeout(() => {
      navigate(`/book/${id}`)
    }, 500)
  }

  return (
    <>
      <div
        className={`relative rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 ${
          !isAvailable ? "opacity-70 grayscale-[0.3]" : ""
        }`}
      >
        <img
          src={
            image.startsWith("http") ? image : `https://images.unsplash.com/${image}?auto=format&fit=crop&w=600&q=80`
          }
          alt={name}
          className="w-full h-80 object-cover"
        />

        {/* Availability Status Badge */}
        <div
          className={`absolute top-4 left-4 flex items-center gap-2 px-3 py-2 rounded-full text-sm font-semibold ${
            isAvailable ? "bg-green-500 text-white" : "bg-red-500 text-white"
          }`}
        >
          {isAvailable ? (
            <>
              <CheckCircle className="w-4 h-4" />
              Available
            </>
          ) : (
            <>
              <XCircle className="w-4 h-4" />
              Not Available
            </>
          )}
        </div>

        {/* Overlay with room details */}
        <div className="absolute inset-0 bg-black bg-opacity-40 flex flex-col justify-end p-4">
          <h3 className="text-white text-2xl font-semibold mb-2">{name.toUpperCase()}</h3>

          <div className="flex items-center text-white text-sm space-x-4 mb-3">
            <div className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              <span>{maxAdults || capacity} Adults</span>
            </div>
            <div className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              <span>{maxChildren || children} Children</span>
            </div>
            <div className="flex items-center gap-1">
              <Ruler className="w-4 h-4" />
              <span>{size}</span>
            </div>
          </div>

          {/* Price and Book Button */}
          <div className="flex items-center justify-between mt-2">
            <div
              className={`font-semibold px-3 py-2 rounded text-sm ${
                isAvailable ? "bg-white text-black" : "bg-gray-300 text-gray-600"
              }`}
            >
              ₨{price.toFixed(2)} / night
            </div>

            <button
              onClick={handleBookClick}
              disabled={!isAvailable}
              className={`px-6 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                isAvailable
                  ? "bg-blue-600 hover:bg-blue-700 text-white cursor-pointer transform hover:scale-105"
                  : "bg-gray-500 text-gray-300 cursor-not-allowed opacity-60"
              }`}
            >
              {isAvailable ? "Book Room" : "Unavailable"}
            </button>
          </div>
        </div>

        {/* Unavailable Overlay */}
        {!isAvailable && <div className="absolute inset-0 bg-black bg-opacity-20 pointer-events-none" />}
      </div>

      {/* Use the same LoginModal component */}
      <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} onSuccess={handleLoginSuccess} />
    </>
  )
}

export default RoomCard
