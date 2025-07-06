# 🏨 PineBlue Hotel Booking System

Welcome to **PineBlue**, your all-in-one hotel management system with real-time booking, room inventory, billing, and email confirmation built in!

---

## 🔗 Project Info

**Hosted on Lovable:**  
https://lovable.dev/projects/52d3fa5c-e473-45b3-bc90-cf91f59cf91b

---

## 🛠 Tech Stack

- 🧠 **Frontend**: React + TypeScript + TailwindCSS + Shadcn UI
- ⚙️ **Backend**: FastAPI (Python 3.11)
- 💌 **Email**: EmailJS integration
- 🐘 **Database**: Supabase (PostgreSQL)
- 📦 **Deployment**: Docker + Railway/Render + Lovable

---

## 🧑‍💻 How Can I Edit This Code?

### ✅ Use Lovable

Just go to [Lovable Project](https://lovable.dev/projects/52d3fa5c-e473-45b3-bc90-cf91f59cf91b) and start prompting.

Changes you make will be automatically committed to this repo.

---

### 💻 Use Your Local Machine (with Docker)

> Requires: `Node.js`, `npm`, `Python 3.11`, and `Docker`

```bash
# Step 1: Clone the repository
git clone <YOUR_GIT_URL>
cd pine-blue

# Step 2: Add environment variables
# Instead of .env files, use Render/Railway dashboards to set:
# VITE_EMAILJS_SERVICE_ID, VITE_EMAILJS_TEMPLATE_ID, VITE_EMAILJS_USER_ID, SUPABASE_URL, SUPABASE_KEY

# Step 3: Let Render/Railway build the Docker container automatically.
# No need to run Docker locally unless you're testing it manually.
