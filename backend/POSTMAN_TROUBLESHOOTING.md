# Postman Connection Troubleshooting Guide

## Problem
Server responds instantly to `curl` but Postman hangs with "no response" or times out.

## Root Cause
This is almost always a **Postman configuration issue**, not a server problem. Postman uses different networking layers than `curl`.

---

## Fix #1: Disable Proxy (MOST COMMON)
1. Open **Postman Settings** (gear icon or File → Settings)
2. Go to **Proxy** tab
3. Turn **OFF** "Use the system proxy"
4. Turn **OFF** "Add a custom proxy configuration"
5. Restart Postman
6. Try again: `GET http://127.0.0.1:3001/health`

---

## Fix #2: Use IP Address Instead of localhost
- **Don't use**: `http://localhost:3001/health`
- **Use instead**: `http://127.0.0.1:3001/health`

Windows can have DNS resolution delays with `localhost`.

---

## Fix #3: Disable SSL Verification
Even for HTTP requests, this can sometimes interfere:
1. Postman Settings → General
2. Turn **OFF** "SSL certificate verification"
3. Restart Postman

---

## Fix #4: Check Postman Desktop Agent (Web App Only)
If using Postman in a browser:
1. Install **Postman Desktop Agent**
2. Ensure it's running (check system tray)
3. In Postman web, bottom-right corner should show "Desktop Agent: Connected"

---

## Fix #5: Disable VPN/Firewall Temporarily
Corporate VPNs and firewalls can intercept localhost traffic:
1. Disconnect from VPN
2. Temporarily disable Windows Firewall
3. Test again

---

## Fix #6: Clear Postman Cache
1. Settings → Data
2. Click "Clear cache"
3. Restart Postman

---

## Verification Steps
After each fix, test with:
```
GET http://127.0.0.1:3001/health
```

**Expected Response:**
```json
{
  "success": true,
  "status": "ok",
  "timestamp": "2026-02-07T...",
  "environment": "development"
}
```

---

## Still Not Working?
Check your terminal running `npm run dev`. When you hit the request in Postman, you should see:
```
--- Incoming Request: GET /health ---
Headers: { ... }
```

**If you DON'T see this log**, the request is being blocked BEFORE it reaches Node.js (network/OS level).

**If you DO see this log**, the server received it but Postman isn't getting the response (rare, but possible with proxy/agent issues).
