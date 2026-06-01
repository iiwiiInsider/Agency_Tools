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

--
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
