const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.replace(/\/+$/, "");

export interface BillingSettings {
  id?: number
  vat: number
  discount: number
  updated_at?: string
}

export interface BillingSettingsResponse {
  success: boolean
  data: BillingSettings
  message: string
}

export interface BillingCalculation {
  base_amount: number
  discount_rate: number
  discount_amount: number
  vat_rate: number
  vat_amount: number
  total_amount: number
}

export const billSettingsApi = {
  // Get current billing settings
  getBillingSettings: async (): Promise<BillingSettingsResponse> => {
    try {
      const response = await fetch(`${API_BASE_URL}/billing-settings`)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      return await response.json()
    } catch (error) {
      console.error("Error fetching billing settings:", error)
      throw error
    }
  },

  // Update billing settings
  updateBillingSettings: async (settings: { vat: number; discount: number }): Promise<BillingSettingsResponse> => {
    try {
      const response = await fetch(`${API_BASE_URL}/billing-settings`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(settings),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error("Error updating billing settings:", error)
      throw error
    }
  },

  // Calculate billing amount
  calculateBilling: async (
    roomPrice: number,
    nights: number,
  ): Promise<{ success: boolean; calculation: BillingCalculation }> => {
    try {
      const response = await fetch(`${API_BASE_URL}/calculate-billing`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          room_price: roomPrice,
          nights: nights,
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error("Error calculating billing:", error)
      throw error
    }
  },

  // Create billing record
  createBilling: async (billingData: {
    booking_id: string
    room_price: number
    payment_method?: string
    payment_status?: string
  }) => {
    try {
      const response = await fetch(`${API_BASE_URL}/billing`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...billingData,
          payment_method: billingData.payment_method || "pending",
          payment_status: billingData.payment_status || "pending",
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error("Error creating billing record:", error)
      throw error
    }
  },
}
