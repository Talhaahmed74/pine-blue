import emailjs from "@emailjs/browser"

export const sendBookingEmail = async (formData: any) => {
  const serviceID = import.meta.env.VITE_EMAILJS_SERVICE_ID
  const templateID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID
  const publicKey = import.meta.env.VITE_EMAILJS_USER_ID

  // Get room type name from the form data
  const roomTypeName = formData.roomTypeName || formData.roomType || "N/A"

  const params = {
    first_name: formData.firstName,
    last_name: formData.lastName,
    email: formData.email,
    phone: formData.phone,
    checkin_date: formData.checkin_date,
    checkout_date: formData.checkout_date,
    room_type: roomTypeName,
    room_number: formData.roomNumber,
    guests: formData.guests || 1,
    payment_status: formData.paymentStatus,
    total_amount: formData.totalAmount,
    booking_status: formData.status || "confirmed",
    // Add customer type for admin bookings
    customer_type: formData.selectedCustomer ? "Existing Customer" : "Walk-in",
  }

  console.log("🔍 All env vars:", import.meta.env)
  console.log("📩 EmailJS ENV", { serviceID, templateID, publicKey })
  console.log("📧 Email params:", params)

  try {
    const result = await emailjs.send(serviceID, templateID, params, publicKey)
    console.log("✅ Email sent!", result.text)
    return { success: true }
  } catch (error: any) {
    console.error("❌ Email failed:", error.text || error)
    return { success: false, error }
  }
}
