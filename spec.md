# Specification

## Summary
**Goal:** Build a full-stack ICP inventory management application for DCS Tech, with a Motoko backend and a React frontend, supporting role-based access, inventory tracking, adjustment logging, and admin user management.

**Planned changes:**

### Backend (Motoko — single actor)
- Data models: `User` (principal, email, role, status, timestamps), `InventoryItem` (id, name, SKU, category, quantity, unit, lowStockThreshold, description, timestamps), `AdjustmentLog` (id, itemId, itemName, adjustedBy, adjustedByEmail, adjustmentType, amount, newQuantity, notes, timestamp)
- Functions: `registerOrLogin()`, `getMyProfile()`, `getAllUsers()`, `updateUserRole()`, `deleteUser()`, `approveUser()`, `rejectUser()`, `getInventoryItems()`, `addInventoryItem()`, `adjustInventory()`, `getAdjustmentLogs()`, `seedDemoInventory()` (10+ items), `seedDemoUsers()` (5+ users)
- Role/status enforcement: admin-only, staff+admin, guest/unapproved restrictions per function

### Frontend
- **Theme:** Single CSS theme file with CSS custom properties for light (white/light-gray/indigo) and dark (dark navy/dark-gray/indigo) modes; globally imported; tokens cover all surfaces, text, accent, destructive, success, warning
- **Theme toggle:** Sun/moon icon in header; persists to localStorage; applies `data-theme` or class to document root
- **Auth:** Internet Identity login; `registerOrLogin()` called on sign-in; new users get `#pending` status; pending/rejected users see status screens; approved users routed to Dashboard
- **Layout shell:** Opaque sidebar (desktop) with nav links (Dashboard, Inventory, Reports, Admin Panel for admins); hamburger drawer (mobile) — both with solid opaque backgrounds, no blur/opacity; header with app title, theme toggle, user indicator, sign-out
- **Login page:** DCS Tech brand name/logo, tagline, Internet Identity sign-in button, themed, no sidebar
- **Dashboard:** Four summary cards (Total Items, Low Stock Count, Total Users [admin only], Recent Activity Count); Low Stock Alerts section (header navigates to Inventory with low-stock filter; items open detail overlay); Recent Activity log (latest 10 entries); loading skeletons and empty states
- **Inventory page:** Filterable table (Name, SKU, Category, Quantity, Unit, Threshold, Status badge); stock-status filter (All/Low Stock/In Stock); URL/state-driven filter for Dashboard pre-apply; row click opens InventoryItemDetail overlay; Add Item button for admins
- **InventoryItemDetail overlay:** Shadcn Dialog with explicit opaque `className` on DialogContent; all item fields; adjustment history table; Add Stock / Remove Stock controls for staff+admin; read-only for guests; toast on success/error; dark semi-transparent backdrop
- **Admin Panel (admin only):** User Management tab — table of all users (Principal, Email, Created, Last Login, Role badge, Status badge); inline role dropdown calling `updateUserRole()` with immediate list refetch; Approve/Reject buttons for pending users; Delete button with fully opaque confirmation dialog; Demo Data section with "Seed Demo Inventory" and "Seed Demo Users" buttons with loading states and toasts
- **Reports page (admin + staff):** Table of all AdjustmentLogs (Date/Time, Item Name, User email, Type badge, Amount, New Quantity, Notes); date range and item name filters; loading and empty states
- **Global feedback:** Toast system for all success/error mutations; loading spinners/skeletons on all async fetches

**User-visible outcome:** Admins can manage users and inventory, approve staff, seed demo data, and view full adjustment reports. Staff can adjust inventory quantities. All users experience a themed, responsive app with Internet Identity login, real-time feedback, and role-appropriate access.
