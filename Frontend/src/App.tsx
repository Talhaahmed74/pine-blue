import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppStateProvider } from "@/components/AppStateContext"; // Import the provider

import Index from "./pages/Index";
import Login from "./pages/login";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => {
  console.log("🌍 VITE_API_BASE_URL =", import.meta.env.VITE_API_BASE_URL);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = () => {
      try {
        const authStatus = localStorage.getItem("bluePinesAuth");
        setIsAuthenticated(authStatus === "true");
      } catch (error) {
        console.error("Error checking authentication:", error);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const handleLogin = () => {
    try {
      localStorage.setItem("bluePinesAuth", "true");
      setIsAuthenticated(true);
    } catch (error) {
      console.error("Error setting authentication:", error);
    }
  };

  const handleLogout = () => {
    try {
      localStorage.removeItem("bluePinesAuth");
      setIsAuthenticated(false);
    } catch (error) {
      console.error("Error removing authentication:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-blue-600">Loading Blue Pines...</p>
        </div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AppStateProvider> {/* Wrap with the state provider */}
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route
                path="/"
                element={
                  isAuthenticated ? (
                    <Navigate to="/home" replace />
                  ) : (
                    <Navigate to="/login" replace />
                  )
                }
              />

              <Route
                path="/login"
                element={
                  isAuthenticated ? (
                    <Navigate to="/home" replace />
                  ) : (
                    <Login onLogin={handleLogin} />
                  )
                }
              />

              <Route
                path="/home"
                element={
                  isAuthenticated ? (
                    <Index onLogout={handleLogout} />
                  ) : (
                    <Navigate to="/login" replace />
                  )
                }
              />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </AppStateProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;