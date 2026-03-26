# Technical Dev Journal: Jaxtra Payroll System Architecture

This journal dissects the engineering and design decisions behind the **Jaxtra Payroll System**, focusing on full-stack architecture, responsive UI strategies, and database isolation.

## 1. Core Architecture Stack
- **Frontend Framework**: Next.js (App Router) for robust routing and server-side rendering support.
- **Styling**: Tailwind CSS for rapid, utility-first UI development and responsive breakpoints.
- **Database & Auth**: Supabase (PostgreSQL) for managed data, authentication, and file storage.
- **Icons**: Lucide-React for a consistent, lightweight SVG icon set.
- **Reporting**: 
  - `jsPDF` & `jsPDF-autotable` for client-side PDF generation.
  - `xlsx` for Excel data exporting.

## 2. UI/UX Strategy: "Mobile-First Utility"
The UI was transformed from a static desktop view into a dynamic, cross-platform experience.

### Glassmorphism & Aesthetics
- **Branding**: Implemented a "Premium Login" experience using `backdrop-blur`, semi-transparent whites, and animated background gradients to create a high-end SaaS feel.
- **Universal Color-Coding**: 
  - **Scale**: `Emerald-700` (Gain), `Red-700` (Debt/Loss), `Blue-600` (Neutral Action).
  - **Implementation**: Applied dark/saturated colors with subtle background tints (`bg-emerald-50/20`) to ensure high contrast and quick scannability.

### Responsive Table-to-Card System
To solve horizontal scrolling on mobile, every data table implements a conditional breakpoint:
- **Desktop (`hidden md:block`)**: High-density `Table` components for bulk editing and data review.
- **Mobile (`block md:hidden`)**: Custom [Card](file:///C:/Users/Azyzy/.gemini/antigravity/scratch/jaxtra-mvp/src/app/%28app%29/admin/page.tsx#210-275) components that stack vertically, providing larger touch targets and better information hierarchy.

## 3. Database & Security Model
### Multi-Tenant Isolation
The system follows a "Business Owner as Tenant" model. 
- **User Isolation**: Every table (`employees`, `loans`, `attendance`, `salary_periods`) contains a `user_id` column linked to `auth.users`.
- **RLS Policies**: Row Level Security (RLS) ensures that a business owner *only* sees their own data. 
- **Public Branding**: A specific `SELECT` policy on `app_settings` allows unauthenticated access to branding (logos) for the login page, while restricting `INSERT/UPDATE` to confirmed admins.

### Data Integrity & Constraints
- **Salary Period Constraints**: Added a unique composite key [(user_id, start_date, end_date)](file:///C:/Users/Azyzy/.gemini/antigravity/scratch/jaxtra-mvp/src/middleware.ts#19-36) to the `salary_periods` table to prevent duplicate calculations while allowing multiple users to manage the same dates independently.

## 4. Feature Implementation Details
### The Payroll Pipeline
1. **Calculation**: Client-side logic iterates through employees, filtering attendance records for the selection range.
2. **Deduction Engine**: A recursive-style logic that applies `salary_adjustments` (loan deductions) across multiple active loan records until the target deduction is met.
3. **Confirmation**: A state-change triggered by the user that permanently persists `loan_payments` and updates the `salary_period` status to `confirmed`.

### PDF Export Engine
- Uses `doc.addImage` to handle dynamic branding logos.
- Dynamically calculates "Sisa Kasbon Setelah Potongan" using current state data to provide employees with real-time financial transparency on their slips.

## 5. Hosting & Compatibility
- **Deployment**: Optimized for Vercel/Next.js hosting with edge functions for performance.
- **Compatibility**: Verified across Chrome (Android), Safari (iOS), and all major desktop browsers. Focus was placed on "Tap Interactivity" (h-10 buttons) for mobile ergonomic support.

---

> [!NOTE]
> This project is designed for scalability—additional modules like "Inventory" or "Expenses" can be added by following the existing multi-tenant pattern and responsive card system.
