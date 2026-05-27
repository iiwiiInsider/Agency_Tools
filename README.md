# ⚖️ LeaseGen Pro — Voice-Powered Lease Generator & Manager

A full-stack glowing-neon lease/mandate management system controlled entirely by voice commands, with OTP email verification for recipients.

---

## 🚀 Quick Start

### 1. Backend
```bash
cd backend
cp .env.example .env      # edit with your Gmail credentials
npm install
npm start                 # runs on http://localhost:4000
```

### 2. Frontend
```bash
cd frontend
npm install
npm run dev               # opens http://localhost:5173
```

---

## 🎙️ Voice Command Reference

| Say...                                           | What happens                        |
|--------------------------------------------------|-------------------------------------|
| `"Create new lease"`                             | Starts a blank new lease            |
| `"Lease type: residential monthly"`              | Sets lease type                     |
| `"Lease holder: John Smith"`                     | Sets landlord/lessor name           |
| `"Recipient: Sarah Johnson"`                     | Sets tenant/lessee name             |
| `"Recipient email: sarah@gmail.com"`             | Sets where the OTP email will go    |
| `"Property: 14 Ocean Drive, Cape Town"`          | Sets property address               |
| `"Rent is 12000"`                                | Sets the rent/value amount          |
| `"Currency: ZAR"`                                | Sets currency (ZAR/USD/GBP/EUR/AED) |
| `"Start date: March 1 2026"`                     | Sets commencement date              |
| `"End date: February 28 2027"`                   | Sets expiry/end date                |
| `"Duration: 12 months"`                          | Sets lease term duration            |
| `"Notes: parking included, no pets"`             | Adds special conditions             |
| `"Save lease"` / `"Create lease"`               | Submits the lease & prompts OTP     |
| `"Show leases"` / `"View all"`                  | Opens the Lease Manager tab         |
| `"Clear"` / `"Reset"`                            | Clears the current form             |

---

## 📧 OTP Email Flow

1. Fill in lease details (voice or manual)
2. Click **Generate Lease & OTP** (or say `"Save lease"`)
3. In the Lease Manager, click **📧 Send OTP** on the created lease
4. Recipient receives a branded email with their **6-digit OTP** and lease summary
5. Enter the OTP in the pop-up modal to **verify and activate** the lease

---

## 🔧 Email Setup (Gmail)

1. Enable 2-Factor Authentication on your Gmail account
2. Go to [Google App Passwords](https://myaccount.google.com/apppasswords)
3. Generate a new password for "Mail"
4. In `backend/.env`:
```
EMAIL_USER=your@gmail.com
EMAIL_PASS=xxxx xxxx xxxx xxxx
```

---

## 📁 Project Structure
```
Lease and OTP Gen/
├── backend/
│   ├── server.js          # Express API + Nodemailer OTP sender
│   ├── .env               # Credentials (gitignored)
│   └── package.json
└── frontend/
    ├── index.html
    ├── vite.config.js
    └── src/
        ├── App.jsx                    # Main app state & routing
        ├── components/
        │   ├── VoiceCommand.jsx       # Web Speech API + waveform
        │   ├── LeaseForm.jsx          # Lease/mandate input form
        │   ├── LeaseManager.jsx       # Dashboard of all leases
        │   └── OTPModal.jsx           # 6-digit OTP Entry & verify
        └── styles/
            └── main.css               # Glowing blue & yellow neon theme
```

---

## 🎨 Theme

Deep space background · **Glowing cyan-blue** accents · **Neon yellow-gold** highlights  
Animated waveform · Pulsing mic rings · Scanline overlay · Orbitron & Rajdhani fonts
