import emailjs from "@emailjs/browser";

export const sendBookingEmail = async (formData: any) => {
  const serviceID = import.meta.env.VITE_EMAILJS_SERVICE_ID;
  const templateID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
  const publicKey = import.meta.env.VITE_EMAILJS_USER_ID;

  const params = {
    first_name: formData.firstName,    
    checkin_date: formData.checkin_date, 
    checkout_date: formData.checkout_date,
    room_type: formData.roomType,         
    room_number: formData.roomNumber,     
    payment_status: formData.paymentStatus,
    total_amount: formData.totalAmount,  
    email: formData.email                 
  };
  

  console.log("🔍 All env vars:", import.meta.env);
  console.log("📩 EmailJS ENV", { serviceID, templateID, publicKey });

  try {
    const result = await emailjs.send(serviceID, templateID, params, publicKey);
    console.log("✅ Email sent!", result.text);
    return { success: true };
  } catch (error: any) {
    console.error("❌ Email failed:", error.text || error);
    return { success: false, error };
  }
};
