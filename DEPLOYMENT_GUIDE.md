# 🚀 Deployment Guide for Marketing Mailer

Congratulations! Your build was successful. Now follow these **exact steps** to deploy your application to your hosting server (cPanel, VPS, or any Node.js hosting).

Since we verified `output: 'standalone'` in your config, Next.js has created a special folder containing *everything* you need.

## 1. Prepare the Files for Upload (On your PC)

You need to combine a few folders before uploading.

1.  **Go to your project folder:** `c:\Users\Administrator\Downloads\ABDM\Compressed\alrrakb proj\marketing-mailer`
2.  **Open the `.next` folder.**
3.  **Open the `standalone` folder.** inside it.
    *   *This is your main deployment folder.*
    *   Content should look like: `package.json`, `server.js`, `.next`, `node_modules`.

### ⚠️ CRITICAL STEP: Copy Static Assets
The standalone folder does **not** include your public images or CSS by default. You **MUST** copy them manually:

1.  **Copy `public` folder**:
    *   Copy the `public` folder from your *main project root*.
    *   Paste it INSIDE `.next/standalone`.
    *   *Result:* `.next/standalone/public`

2.  **Copy `static` folder**:
    *   Go to `.next/static` (in your main project, NOT inside standalone).
    *   Copy the `static` folder.
    *   Go to `.next/standalone/.next`.
    *   Create a folder named `static` (if it doesn't exist) or Paste the `static` folder here.
    *   *Result:* `.next/standalone/.next/static`

---

## 2. Upload to Server

Now, zip the entire content of `.next/standalone`.
**Upload this ZIP to your hosting server** (e.g., inside `public_html` or a subfolder like `mailer`).

**Folder Structure on Server should look like this:**
```
/home/username/public_html/mailer/
├── .next/
│   ├── static/       <-- (The one you copied)
│   └── ...
├── node_modules/     <-- (Came with standalone)
├── public/           <-- (The one you copied)
├── package.json
└── server.js         <-- (The entry point)
```

---

## 3. Run the Server (cPanel / Terminal)

### Option A: cPanel "Setup Node.js App"
1.  Go to **Setup Node.js App** in cPanel.
2.  Click **Create Application**.
3.  **Application Root:** `public_html/mailer` (where you uploaded files).
4.  **Application URL:** `mailer.rrakb.com` (or whatever subdomain you use).
5.  **Application Startup File:** `server.js` (Type exactly this).
6.  Click **Create**.
7.  Click **Start App**.

### Option B: VPS / Command Line
1.  Navigate to the folder: `cd /path/to/app`
2.  Run:
    ```bash
    PORT=3000 node server.js
    ```
3.  Use a process manager like `pm2` to keep it running:
    ```bash
    npm install -g pm2
    pm2 start server.js --name "mailer"
    ```

---

## 4. Environment Variables

Don't forget your `.env`!
1.  Create a new file named `.env` in the server folder (same place as `server.js`).
2.  Copy the contents from your local `.env.local` into it.
3.  **Important:** Make sure `NEXT_PUBLIC_APP_URL` matches your actual domain (e.g., `https://mailer.rrakb.com`).

**You are ready to go! 🚀**
