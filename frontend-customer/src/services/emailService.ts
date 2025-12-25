import emailjs from "@emailjs/browser"

interface BookingEmailData {
  firstName: string
  email: string
  checkin_date: string
  checkout_date: string
  roomType: string
  roomNumber: string
  totalAmount: number
  paymentStatus: string
}

export const sendBookingEmail = async (formData: BookingEmailData) => {
  const serviceID = import.meta.env.VITE_EMAILJS_SERVICE_ID
  const templateID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID
  const publicKey = import.meta.env.VITE_EMAILJS_USER_ID

  if (!serviceID || !templateID || !publicKey) {
    console.error("Missing EmailJS environment variables")
    throw new Error("Email service not configured")
  }

  const params = {
    first_name: formData.firstName,
    checkin_date: formData.checkin_date,
    checkout_date: formData.checkout_date,
    room_type: formData.roomType,
    room_number: formData.roomNumber,
    payment_status: formData.paymentStatus,
    total_amount: formData.totalAmount.toLocaleString(),
    email: formData.email,
  }

  console.log("📩 Sending email with params:", params)

  try {
    const result = await emailjs.send(serviceID, templateID, params, publicKey)
    console.log("✅ Email sent successfully!", result.text)
    return { success: true }
  } catch (error: any) {
    console.error("❌ Email sending failed:", error)
    throw new Error(error.text || "Failed to send email")
  }
}