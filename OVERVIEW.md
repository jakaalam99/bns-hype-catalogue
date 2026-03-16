# BNS HYPE - Digital Catalogue & Partner Portal

BNS HYPE is a premium digital catalogue system designed for high-end product showcasing and partner management. It features a modern, high-performance web interface with a focus on minimalist aesthetics and robust administrative tools.

## 🎨 Design Philosophy
- **Premium Monochrome**: A sleek white-and-black design system utilizing `font-sans` for a clean, professional look.
- **Dynamic Backgrounds**: Interactive grid systems and particle layers (`BackgroundParticles`) that adapt based on the page context (Catalogue vs. Admin).
- **Responsive Navigation**: A versatile sidebar-based navigation system for both administrators and partners.

## 🚀 Key Features

### 1. Public Catalogue Experience
- **Interactive Grid**: A high-speed, paginated product grid with search and category filtering.
- **Product Visibility**: Intelligent filtering that only shows "Active" products to the public while hiding "Hidden" items.
- **Detailed Product Pages**: Comprehensive views including multiple images, SKU details, and configurable "Contact Us" actions.
- **Program Catalogues**: Dedicated collections and promotional pages (e.g., Seasonal Drops) reachable via unique links.
- **About & Socials**: Rich social cards for Instagram, TikTok, and WhatsApp, configurable via the admin dashboard.

### 2. Partner & Ordering (Putus Role)
- **Basket System**: Users with the `putus` role can add products to a local "Basket".
- **Bulk Selection**: Partners can review their chosen items, adjust quantities, and manage their selection.
- **Excel Export**: Generate professional Excel order forms from the basket content for streamlined procurement.

### 3. Brand Guidance Resource Hub
- **Centralized Assets**: A dedicated space for partners to download official PDF guidelines and branding materials.
- **Visual Previews**: Documents feature custom thumbnails for easy identification.
- **Role-Agnostic Access**: Quickly accessible from the main sidebar for both public users and partners.

### 4. Admin Panel (Partner Portal)
- **Dashboard**: Real-time stats on product count, active programs, and system health.
- **Advanced Product Management**:
    - **Status Tabs**: Easily switch between "All", "Active", and "Hidden" products.
    - **Batch Visibility**: Bulk update hundreds of SKUs at once using Excel file imports.
    - **Excel/CSV Integration**: Full support for importing new inventory and exporting existing data.
- **Program Management**: Create special promotional collections by simply listing SKUs.
- **Global Settings**:
    - Manage store locations with Google Maps integration.
    - Configure social media links (multiple links per platform).
    - Dynamic Favicon management supporting Google Drive direct links.
    - Contact URL configuration for the global catalogue.

## 🛠 Technical Architecture
- **Frontend**: React + Vite (Fast, modern development).
- **Styling**: Tailwind CSS + Custom CSS Modules (Glassmorphism & Particles).
- **Backend/DB**: Supabase (PostgreSQL, Storage, Auth).
- **Utilities**: 
    - `lucide-react` for iconography.
    - `xlsx` for robust spreadsheet processing.
    - `react-router-dom` for complex role-based routing.

## 👥 User Roles
- **Superadmin/Admin**: Unrestricted access to the Partner Portal and all catalogue settings.
- **Putus**: Specialized partner role with access to the Basket system and order exports.
- **Public**: Anonymous users who can browse active catalogues and access brand guidance.
