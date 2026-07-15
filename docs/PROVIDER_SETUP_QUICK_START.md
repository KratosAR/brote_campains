# Provider Setup — Quick Start Guide

**For end-users: How to set up messaging providers in 3 minutes.**

---

## 🚀 Setup Your First Provider

### WhatsApp (Meta)

#### 1. Get Your Credentials
- Go to: https://developers.facebook.com/
- Create a new app (Business type)
- Add "WhatsApp" product
- Go to "WhatsApp API Setup"
- Copy: **Phone Number ID** and **Access Token**

#### 2. Enter in BCP
1. Log into BCP dashboard
2. Click **Settings** → **Messaging Providers**
3. Click **+ Connect WhatsApp**
4. Select **Meta WhatsApp Business**
5. Paste credentials:
   - Phone Number ID: `1138669749338044`
   - Access Token: `EAAG...`
6. Click **Test Connection** ✅
7. Click **Save** 💾

#### 3. Send a Message
- Create a campaign with WhatsApp channel
- Choose contacts
- Send! 📱

---

### WhatsApp (Evolution — Open Source)

#### 1. Start Evolution API
```bash
# Option A: Docker (easiest)
docker run -p 8080:8080 \
  -e DATABASE_URL=postgres://user:pass@db:5432/evolution \
  -e REDIS_URL=redis://redis:6379 \
  evolutionfoundation/evolution-api:latest

# Option B: Manual
git clone https://github.com/evolution-foundation/evolution-api
cd evolution-api
npm install
npm run dev:server
```

#### 2. Create Instance & Get QR Code
- Open: http://localhost:8080/manager
- Create new instance
- Scan QR code with your personal WhatsApp
- Wait for "Instance connected" ✅

#### 3. Enter in BCP
1. Log into BCP dashboard
2. Click **Settings** → **Messaging Providers**
3. Click **+ Connect WhatsApp**
4. Select **Evolution API**
5. Fill in:
   - Server URL: `http://localhost:8080` (or your server)
   - API Key: (shown in Evolution logs)
   - Instance Name: (name you created in Evolution)
6. Click **Test Connection** ✅
7. Click **Save** 💾

---

### Email (SMTP)

#### 1. Get SMTP Credentials
**Gmail:**
- Generate App Password: https://myaccount.google.com/apppasswords
- Use in BCP

**Outlook/Office 365:**
- Host: `smtp.office365.com`
- Port: `587`
- Email: your@company.com
- Password: your password

**Generic SMTP:**
- Ask your email provider for:
  - SMTP Server (host)
  - Port (usually 587 or 465)
  - Username
  - Password

#### 2. Enter in BCP
1. Log into BCP dashboard
2. Click **Settings** → **Messaging Providers**
3. Click **+ Connect Email**
4. Select **SMTP**
5. Fill in:
   - SMTP Host: `smtp.gmail.com`
   - Port: `587`
   - Email Address: `your@gmail.com`
   - Password: (app password, not regular password)
6. Click **Test Connection** ✅
7. Click **Save** 💾

---

### SMS (Twilio)

#### 1. Get Twilio Credentials
- Sign up: https://twilio.com
- Go to **Account** → **API Keys**
- Copy: **Account SID** and **Auth Token**
- Get a Twilio number (or use existing)

#### 2. Enter in BCP
1. Log into BCP dashboard
2. Click **Settings** → **Messaging Providers**
3. Click **+ Connect SMS**
4. Select **Twilio**
5. Fill in:
   - Account SID: `AC123456...`
   - Auth Token: (password)
   - From Number: `+1-555-123-4567`
6. Click **Test Connection** ✅
7. Click **Save** 💾

---

## ⚠️ Troubleshooting

### "Test Connection Failed"

**WhatsApp (Meta):**
- ❌ Invalid token → regenerate at Meta Dashboard
- ❌ Wrong phone number → copy exact ID (no country code)
- ❌ App not approved → submit for review on Meta

**WhatsApp (Evolution):**
- ❌ Server not reachable → check URL (http://localhost:8080)
- ❌ Instance not connected → scan QR code in Evolution Manager
- ❌ Invalid API key → copy from Evolution logs

**Email (SMTP):**
- ❌ Connection refused → use correct port (587 or 465)
- ❌ Auth failed → use app password, not regular password
- ❌ Host not found → check server name spelling

**SMS (Twilio):**
- ❌ Auth failed → check Account SID and Token
- ❌ Invalid number → use E.164 format: +1-555-123-4567

---

## ✅ Verify It's Working

### Send a Test Message
1. Create a campaign
2. Add your own phone number
3. Select the provider you just set up
4. Click **Send Now**
5. Check your phone! 📱

### Check Status
- Go to **Campaign** → **Delivery Status**
- Should see: `Sent` ✅ or `Delivered` ✅

---

## 🔒 Security Notes

- Never share your credentials with anyone
- Passwords are encrypted in our database
- We never log or display your full credentials
- Only the last 8 characters visible in settings

---

## 📖 Need More Help?

- **Meta WhatsApp**: https://developers.facebook.com/docs/whatsapp/api/
- **Evolution API**: https://github.com/evolution-foundation/evolution-api
- **SMTP Guide**: https://www.google.com/search?q=SMTP+your+email+provider
- **Twilio**: https://www.twilio.com/docs/sms

---

**Done! You're ready to send messages.** 🚀
