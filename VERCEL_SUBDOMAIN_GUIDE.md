# 🌐 Vercel + Hostinger DNS Setup (Subdomains)

Since your domain (`rrakb.com`) is on Hostinger but you are deploying to Vercel, you need to point a specific subdomain (like `mail` or `app`) to Vercel.

## 1. Vercel: Add the Domain
1.  Go to your **Vercel Dashboard** > Select your Project.
2.  Go to **Settings** > **Domains**.
3.  Type your desired subdomain (e.g., `mail.rrakb.com`) and click **Add**.
4.  Vercel will show an "Invalid Configuration" error initially. It will give you a **CNAME** Value (usually `cname.vercel-dns.com`).

## 2. Hostinger: Add DNS Record
1.  Log in to your **Hostinger Dashboard**.
2.  Go to **Domains** > Select `rrakb.com`.
3.  Click on **DNS / Zone Editor**.
4.  Scroll down to **Manage DNS Records** and add a new record:
    *   **Type:** `CNAME`
    *   **Name:** `mail` (or whatever subdomain you chose, WITHOUT .rrakb.com)
    *   **Target (Points to):** `cname.vercel-dns.com`
    *   **TTL:** Leave as default (e.g., 14400 or 3600).
5.  Click **Add Record**.

## 3. Verify
1.  Go back to Vercel Domains page.
2.  Hostinger DNS is fast, but it might take 1-5 minutes.
3.  Once the record propagates, Vercel will show a ✅ (Valid Configuration).
4.  Your site will be live at `https://mail.rrakb.com`.
