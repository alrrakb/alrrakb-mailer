# Project Knowledge Base: Enterprise Marketing Mailer SaaS

## 1. Project Overview
The Enterprise Marketing Mailer SaaS is a robust, scalable web application designed to manage, queue, and dispatch marketing email campaigns. It includes real-time dashboards, an advanced HTML email editor with attachment support, multi-language support (Arabic/English), and complex backend queue processing with IMAP inbox syncing for simulated replies. 

## 2. Tech Stack
-   **Frontend Framework**: Next.js 16 (App Router)
-   **Styling**: Tailwind CSS, PostCSS
-   **Icons**: Lucide React
-   **State & Theming**: React Context (`next-themes`, Custom `LanguageProvider`, Custom `AuthProvider`)
-   **Database & Auth**: Supabase (PostgreSQL, Auth, RLS)
-   **Email Providers**: Resend (Batch APIs for dispatch), `imap-simple` (for inbox syncing)
-   **Editor**: `react-simple-wysiwyg` (HTML compose logic)
-   **Deployment**: Vercel (Frontend & Serverless APIs)

## 3. Architecture & Key Patterns

### 3.1 Role-Based Access Control (RBAC)
The application employs a strict, dual-layered RBAC model combining UI-level masking and backend API enforcement.
*   **Permissions Schema**: Stored in a custom `permissions` JSONB column on the `profiles` table. Divided into `pages` (e.g., `inbox`, `compose`) and `actions` (e.g., `inbox_delete`, `queue_send`).
*   **Frontend**: A custom React Hook `usePermissions()` consumes the context and determines module visibility. E.g., The Compose window hides the *Attachments* toggle or the *HTML toggle* if the user lacks the permission.
*   **Backend**: `lib/permissions.server.ts` handles the API blocking logic. All critical mutations (`PATCH`, `DELETE`, `POST`) check `checkServerActionPermission()` before executing, preventing direct API access bypass.

### 3.2 Supabase Auth, Security, and Data Isolation
The database leverages Supabase Row Level Security (RLS) to enforce data isolation (users can solely access their own campaigns, contacts, etc.).
*   **Admin Bypass**: Hardcoded email checks (`admin@rrakb.com`) and Role checks (`role === 'admin'`) exist to grant administrators global visibility. 
*   **Service Role Key Bypass Pattern**: For tables where RLS blocked non-admin users due to missing legacy `user_id` records, we employ a specific backend pattern: We bypass RLS using the `SUPABASE_SERVICE_ROLE_KEY` in API Routes (such as `/api/history` and `/dashboard`), but **manually chain explicit ownership constraints** (e.g., `.eq('sender_email', userEmail)`) on the Supabase query to simulate strict RLS without the false-blocking side effects. 

### 3.3 UI Layout Strategy (App-like Flexbox)
The application, specifically the Compose Email system, leans heavily into an "app-like" structural design rather than traditional scrolling webpages.
*   **Sticky Constraints**: Uses strictly constrained `flex-col`, `flex-1`, and `overflow-y-auto` combinations to ensure navigation bars, headers, and action bars (e.g., Send/Schedule) remain *fixed* in place, while the central text editor or list area scrolls cleanly between them.

## 4. Core Features Implemented
*   **User & Permissions Management**: Dynamic Admin Modal for overriding JSONB flags on individual users.
*   **Compose Email Sandbox**: A split layout handling multiple attachments, variable substitutions (templates), and HTML toggle states, restricted dynamically based on permissions.
*   **Optimized Queue Polling**: The Admin Queue page includes background polling using intervals, aggressively throttled and guarded by visibility states and `isMounted` checks to prevent React state manipulation errors & API slamming.
*   **History & Inbox Sync**: Syncs external server replies via IMAP. The sync action uses the master `SMTP_FROM_EMAIL` to pull admin-level data regardless of the currently logged-in user.
*   **True RTL Language Support**: Bidirectional CSS logic powered by Next.js dictionaries.
*   **System-Wide Dark Mode**: Fully integrated Tailwind Dark Mode.

## 5. Project Structure & Critical Files
*   `app/(main)/`: Primary authenticated architecture. Includes nested directories for `compose/`, `history/`, `dashboard/`, `inbox/`, `settings/`.
*   `app/api/`: Contains critical serverless routes controlling state and Supabase queries. (e.g., `history/route.ts`, `inbox/route.ts`, `queue/process/route.ts`).
*   `components/email/ComposeWindow.tsx`: The crux of the email construction logic. Very complex flex-based UI.
*   `lib/permissions.server.ts`: The absolute source of truth for backend security. 
*   `hooks/usePermissions.ts`: The absolute source of truth for frontend masking.
*   `supabase/migrations/`: Tracks database schema alterations, crucially `20260305195000_strict_rls_policies.sql`.

## 6. Current State
*   **Status**: Fully Functional & Secure.
*   **Recent Fixes**: Resolved critical UI bugs related to spacing in the email editor header, fixed TypeScript validation errors (`usePermissions` imports), patched strict Admin email lockouts across settings, and corrected the standard-user data visibility issues in the History/Dashboard routes by accurately modeling ownership columns.
