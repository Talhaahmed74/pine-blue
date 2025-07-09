# 🌐 Pine Blue Hotel Management System

This is a full-stack hotel booking system with separate admin and customer-facing frontends. It uses **FastAPI** for backend, **React** for frontend interfaces, and includes features like room inventory, booking management, billing, and email notifications.

---

## 📁 Project Structure
/pine-blue
├── Backend/
├── Frontend/
└── frontend-customer/


---

## ⚙️ Setup Instructions

### 🔧 Backend (FastAPI)

1. Navigate to the backend folder:
   ```bash
   cd Backend
   python -m venv venv
   source venv/bin/activate  # Linux/Mac
   venv\Scripts\activate     # Windows
   pip install -r requirements.txt
   ```
2. create a.env in Backend directory
    ```bash
    SUPABASE_URL=https://aztusrzeyeckqiztmhgd.supabase.co
    SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF6dHVzcnpleWVja3FpenRtaGdkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE3MTQwMjEsImV4cCI6MjA2NzI5MDAyMX0.Ni-2-hHgcNpqCOv76-75a8gnCePCVFzNbzvhQKRtqmw
    ```
🎨 Frontend (Admin Panel)
Move to the frontend folder:

    ```bash
    cd ..
    cd Frontend
    npm install
    npm run dev
   ```
Create a .env file in the Frontend directory:
    ```bash
       VITE_EMAILJS_SERVICE_ID=service_o3ks0kc
       VITE_EMAILJS_TEMPLATE_ID=template_eknjb1v
       VITE_EMAILJS_USER_ID=TU8YR_SCuiRvsjZIi
       VITE_EMAILJS_API=https://api.emailjs.com/api/v1.0/email/send
    ```
👥 Frontend-Customer (Customer View)
Go back to the root and move to the customer frontend:
   ```bash
   cd ..
   cd frontend-customer
   npm install
   npm run dev
   ```
Create a .env file in the frontend-customer directory:
```bash
    VITE_EMAILJS_SERVICE_ID=service_o3ks0kc
    VITE_EMAILJS_TEMPLATE_ID=template_eknjb1v
    VITE_EMAILJS_USER_ID=TU8YR_SCuiRvsjZIi
    VITE_EMAILJS_API=https://api.emailjs.com/api/v1.0/email/send
```




    





