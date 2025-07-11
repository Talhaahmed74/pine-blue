import { Toaster } from "@/components/ui/toaster"
import './assets/fonts/fonts.css';
import { Toaster as Sonner } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { AuthProvider } from "@/contexts/AuthContext"
import Home from "./pages/Home"
import Rooms from "./pages/Rooms"
import BookRoom from "./pages/BookRoom"
import UserDashboard from "./pages/UserDashboard"
import PaymentSuccess from "./pages/PaymentSuccess"
import NotFound from "./pages/NotFound"
import AboutUs from "./pages/AboutUs"
import ContactUs from "./pages/ContactUs"
import MobileNavigation from "./components/MobileNavigation"
import ProtectedRoute from "./components/ProtectedRoute"

const queryClient = new QueryClient()

const App = () => {
  // ✅ Console log here — inside the function body, before the return
  console.log("🌐 [Customer] VITE_API_BASE_URL =", import.meta.env.VITE_API_BASE_URL);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/rooms" element={<Rooms />} />
              <Route path="/about" element={<AboutUs />} />
              <Route path="/contact" element={<ContactUs />} />
              <Route path="/book/:roomId" element={<BookRoom />} />
              <Route path="/book-room" element={<BookRoom />} />
              <Route path="/auth" element={<Navigate to="/" replace />} />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <UserDashboard />
                  </ProtectedRoute>
                }
              />
              <Route path="/payment-success" element={<PaymentSuccess />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
            <MobileNavigation />
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};


export default App
