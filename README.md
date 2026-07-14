# 🐾 Pawfect Pet Supplies - Mobile POS System

![React](https://img.shields.io/badge/React-18.x-61DAFB?style=flat-square&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript)
![Vite](https://img.shields.io/badge/Vite-Latest-646CFF?style=flat-square&logo=vite)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.x-06B6D4?style=flat-square&logo=tailwindcss)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=flat-square&logo=supabase)
![License](https://img.shields.io/badge/License-All%20Rights%20Reserved-red?style=flat-square)
![Status](https://img.shields.io/badge/Build-Passing-brightgreen?style=flat-square)

---

## 🎯 Overview

**Pawfect Pet Supplies** is a **modern, offline-capable Progressive Web App (PWA)** designed to revolutionize retail operations for pet supply stores. Built with cutting-edge web technologies, this mobile-first POS system eliminates app store friction while delivering a seamless, fast, and reliable checkout experience—even when the internet goes down.

The system serves as a complete sales, inventory, and analytics platform tailored for pet retailers, combining sleek design with engineering robustness to handle high-volume transactions and intermittent connectivity challenges.

---

## ✨ Key Features

- 🛍️ **Smart Product Catalog** - Responsive grid with category filtering, search, and popular item badges for rapid checkout
- 📱 **Barcode Scanner Integration** - Real-time barcode scanning with fallback manual SKU entry and visual feedback  
- 🛒 **Dynamic Shopping Cart** - Intuitive quantity controls, real-time totals, and item removal with toast notifications
- 💳 **Multi-Payment Gateway** - Cash (with intelligent keypad & change calculation), Card, and E-Wallet (GCash/Maya) support
- 👥 **Member Loyalty Program** - 5% member discount, point accumulation (1 point per ₱10), and transaction history per customer
- 🔐 **Role-Based Access Control** - Tiered permissions (Staff, Admin) with protected routes for sensitive operations
- 🌐 **Offline-First Architecture** - IndexedDB sync engine automatically queues sales when offline and syncs on reconnect
- ⚡ **Real-Time Connectivity Management** - Live network status badges, pending sync counters, and heartbeat monitoring (45-second intervals)
- 📊 **Advanced Reporting Dashboard** - Branch performance metrics, sales trends, category breakdowns, and payment method analytics
- 📱 **Progressive Web App** - Installable on home screens, works offline, with service worker deep caching
- ♿ **Accessible UI Framework** - Radix UI component primitives ensure WCAG 2.1 compliance and keyboard navigation
- 🎨 **Pet-Centric Design System** - Warm, inviting color palette (`#7BA886` sage green, `#F5F1E8` cream) with emoji-enhanced categories

---

## 🏗️ Architecture & Tech Stack

### **Frontend Layer**
- **Framework**: React 18 with TypeScript for type safety and maintainability
- **Build Tool**: Vite (lightning-fast HMR and optimized production bundles)
- **Styling**: Tailwind CSS with custom design tokens for consistent branding
- **UI Components**: Radix UI (unstyled, accessible primitives) + custom styled wrappers
- **State Management**: React Context API (Auth, Connectivity) + local component state
- **HTTP Client**: Supabase JS SDK for real-time database sync

### **Backend & Data**
- **Primary Database**: Supabase PostgreSQL with RLS (Row-Level Security) policies
- **API Layer**: Supabase REST endpoints + real-time subscriptions via WebSockets
- **Offline Storage**: Browser IndexedDB (via supabase-js with custom sync logic)
- **Service Worker**: Workbox integration for asset caching and offline routing

### **Directory Structure**

```
src/
├── main.tsx                           # React entry point
├── app/
│   ├── App.tsx                        # Router & provider setup
│   ├── components/
│   │   ├── PosCheckoutPanel.tsx       # Multi-step payment flow (cash/cashless)
│   │   ├── BarcodeScanner.tsx         # Barcode input with camera/manual fallback
│   │   ├── PetProductGrid.tsx         # Responsive product catalog
│   │   ├── PetCart.tsx                # Shopping cart manager
│   │   ├── CategoryTabBar.tsx         # Category selector with emoji icons
│   │   ├── UserLogin.tsx              # Staff/member authentication modal
│   │   ├── PosStaffBar.tsx            # Header with role badge & logout
│   │   ├── AddItemModal.tsx           # (Admin) Product creation modal
│   │   ├── UpdateItemModal.tsx        # (Admin) Product edit modal
│   │   ├── StaffRestrictedRoute.tsx   # Role-gated route wrapper
│   │   ├── NetworkStatusBadge.tsx     # Real-time connectivity indicator
│   │   ├── PetTransactionHistory.tsx  # Order history viewer
│   │   ├── ui/                        # Radix + Tailwind UI primitives
│   │   │   ├── button.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── input.tsx
│   │   │   ├── select.tsx
│   │   │   └── ...15+ more components
│   │   ├── figma/
│   │   │   └── ImageWithFallback.tsx  # Fallback image handler
│   │   └── reports/
│   │       ├── SalesTrendChart.tsx    # Line chart (Recharts)
│   │       ├── CategoryChart.tsx      # Category breakdown chart
│   │       ├── PaymentDonut.tsx       # Payment method distribution
│   │       ├── TopProducts.tsx        # Best-selling products table
│   │       ├── HeroMetrics.tsx        # KPI cards (revenue, transactions)
│   │       └── BranchTable.tsx        # Branch performance comparison
│   ├── pages/
│   │   ├── PosPage.tsx                # Main sales interface (2-column layout)
│   │   ├── InventoryPage.tsx          # (Staff) Product management
│   │   ├── ReportDashboard.tsx        # (Staff) Analytics & reporting
│   │   └── UsersPage.tsx              # (Admin) User/member management
│   ├── context/
│   │   ├── AuthContext.tsx            # Cashier/staff login state & role refresh
│   │   └── ConnectivityContext.tsx    # Online status, sync queues, heartbeat
│   ├── services/
│   │   ├── checkoutService.ts         # Sale completion & receipt generation
│   │   └── productService.ts          # Product CRUD operations
│   ├── offline/
│   │   ├── db.ts                      # IndexedDB schema & query builders
│   │   ├── productRepository.ts       # Product cache layer (read/write)
│   │   ├── syncEngine.ts              # Offline queue → backend sync orchestration
│   │   └── types.ts                   # Offline data structures
│   ├── hooks/
│   │   └── useReportData.ts           # Analytics data fetching & aggregation
│   ├── lib/
│   │   ├── generateUuid.ts            # Client-side UUID generation
│   │   ├── productOrder.ts            # Drag-n-drop reordering logic
│   │   └── supabase.ts                # Supabase client initialization
│   ├── constants/
│   │   ├── appNav.ts                  # Route definitions & breadcrumbs
│   │   ├── reportNav.ts               # Report filter options
│   │   └── roles.ts                   # Role definitions (staff, admin)
│   ├── data/
│   │   └── pet-products.ts            # Static product seed data
│   ├── types/
│   │   └── pos.ts                     # TypeScript interfaces (Product, CartItem, Transaction, etc.)
│   └── styles/
│       ├── index.css                  # Global resets
│       ├── fonts.css                  # Custom font declarations
│       ├── tailwind.css               # Tailwind directives
│       └── theme.css                  # CSS variables (colors, shadows, transitions)
├── config/                            # (Reserved for environment/vite overrides)
├── lib/
│   ├── supabase.ts                    # Shared Supabase client
│   └── reportDateRange.ts             # Date range utilities for analytics
└── styles/
    └── ... (global styles)

public/
├── manifest.json                      # PWA manifest (app name, icons, start URL)
└── ... (static assets)

dev-dist/
├── registerSW.js                      # Service worker registration
└── workbox-*.js                       # Workbox bundle (offline caching)

scripts/
└── generate-app-test-plan-xlsx.mjs    # Test plan generation utility

vite.config.ts                         # Vite + PWA plugin configuration
postcss.config.mjs                     # Tailwind + PostCSS pipeline
package.json                           # Dependencies & build scripts
```

---

## 🚀 Local Development & Installation

### **Prerequisites**
- **Node.js**: v18+ (LTS recommended)
- **npm**: v9+ (comes with Node.js)
- **Supabase Account**: Register at [supabase.com](https://supabase.com) for a free PostgreSQL database
- **Modern Browser**: Chrome, Firefox, Safari, or Edge (for PWA & IndexedDB support)

### **Step 1: Clone the Repository**

```bash
git clone https://github.com/erisreyes/pos_petsupplies_d.git
cd "Mini Step POS"
```

### **Step 2: Install Dependencies**

```bash
npm install
```

This installs all packages defined in `package.json`, including React, Vite, Tailwind, Radix UI, Supabase JS SDK, and charting libraries.

### **Step 3: Configure Environment Variables**

Create a `.env.local` file in the root directory with the following structure:

```env
# Supabase Connection
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...your-public-anon-key...

# Optional: API Gateway (if using custom backend)
VITE_API_BASE_URL=http://localhost:3000

# Optional: Analytics Tracking
VITE_ANALYTICS_ID=UA-XXXXXXXXX-X

# Optional: Feature Flags
VITE_ENABLE_OFFLINE_MODE=true
VITE_SYNC_INTERVAL_MS=5000
```

**To obtain Supabase credentials:**
1. Log in to your Supabase project dashboard
2. Navigate to **Project Settings → API**
3. Copy your **Project URL** and **anon (public) key**
4. Paste them into `.env.local`

⚠️ **Security Note**: Never commit `.env.local` to version control. Add it to `.gitignore`.

### **Step 4: Run the Development Server**

```bash
npm run dev
```

Vite launches a local server (typically `http://localhost:5173`) with hot module replacement enabled. Open your browser and start testing.

### **Step 5: (Optional) Start PWA Mode**

To test the PWA locally (service worker + offline):

```bash
npm run build
npm run preview
```

This builds the production bundle and serves it locally, allowing you to test service worker registration and offline behavior.

---

## 🛡️ Edge Cases & Safety Handlers (Engineering Notes)

### **1. Responsive Layout Crash Prevention**

The checkout panel implements **optional chaining** to gracefully handle missing dependent values:

```tsx
// src/app/components/PosCheckoutPanel.tsx
const change = selectedMethod === 'cash' && tenderedCents >= totalCents 
  ? (tenderedCents - totalCents) / 100 
  : 0;

// Safely access nested properties without runtime errors
{receiptData?.change > 0 && (
  <p>Change: ₱{receiptData.change.toFixed(2)}</p>
)}

// Disable buttons when preconditions unmet
disabled={isProcessing || (step === 'cash-details' && !canCompleteCash)}
```

This prevents UI crashes when dropdown states change during async operations or if data is undefined.

### **2. Timezone-Aware Date Boundary Logic**

The reporting dashboard handles timezone boundaries for accurate date-range filtering:

```tsx
// src/app/hooks/useReportData.ts
// Date range queries are converted to UTC to avoid DST edge cases
const startOfDay = new Date(dateRange.from);
startOfDay.setUTCHours(0, 0, 0, 0);  // UTC midnight

const endOfDay = new Date(dateRange.to);
endOfDay.setUTCHours(23, 59, 59, 999); // UTC 23:59:59

// Query transactions within boundary
const { data: transactions } = await supabase
  .from('transactions')
  .select('*')
  .gte('created_at', startOfDay.toISOString())
  .lte('created_at', endOfDay.toISOString());
```

This prevents day-boundary errors when filtering sales by date across different user locales.

### **3. Offline Sync Conflict Resolution**

The sync engine uses **optimistic updates** with conflict detection:

```tsx
// src/app/offline/syncEngine.ts
// Queue sales locally with unique IDs
const localSale = { 
  id: generateUuid(),  // Client-side UUID
  clientSaleId: generateUuid(),
  status: 'pending',
  createdAt: new Date().toISOString(),
  ...saleData
};
await db.transactions.add(localSale);

// On reconnect, sync and detect conflicts
const syncResult = await syncOutboxSales();
if (syncResult.conflicts.length > 0) {
  // Server-generated ID takes precedence
  await resolveConflicts(syncResult.conflicts);
}
```

This ensures lost sales are never silently dropped during network outages.

---

## 📦 Deployment & PWA Distribution

### **Why a PWA Instead of Native Apps?**

This system operates as a **Progressive Web App (PWA)** — not a native iOS/Android app — for critical business reasons:

1. **Zero App Store Fees** - Eliminate 30% commission fees from Apple App Store and Google Play
2. **Instant Updates** - Deploy new features in real-time without waiting for app store review cycles
3. **Cross-Platform** - Single codebase runs identically on iOS, Android, Windows, and macOS
4. **Offline Capability** - Service workers cache the entire app shell; users access sales tools even with no internet
5. **Hardware Integration** - PWAs can access device cameras (barcode scanning), geolocation, and hardware keypads via Web APIs

### **Deployment Architecture**

#### **Frontend Hosting**
- **Build Output**: `npm run build` generates optimized bundles in `dist/`
- **Recommended Host**: Vercel (automatic deployments on git push), Netlify, or GitHub Pages
- **Service Worker**: Automatically registered via Vite PWA plugin; caches all static assets (~150KB)

```bash
npm run build
# dist/ now contains:
# - index.html (entry point)
# - js/main-*.js (React code, minified)
# - css/style-*.css (Tailwind output)
# - sw.js (service worker)
# - manifest.json (PWA metadata)
```

#### **Backend & Database**
- **Database Host**: Supabase (managed PostgreSQL)
- **Authentication**: Supabase RLS policies + JWT tokens
- **Real-Time Sync**: Supabase WebSocket subscriptions for live catalog updates
- **Monitoring**: Supabase built-in metrics (database size, API calls, uptime)

#### **PWA Installation & Monetization**

**User Installation Flow:**
1. User visits `https://yourdomain.com/pos` in mobile browser
2. Browser shows "Install" (iOS/Android) or "Add to Home Screen" prompt
3. App installs with custom icon & splash screen (from `manifest.json`)
4. User launches app — runs full-screen, no browser chrome

**Example `manifest.json`:**
```json
{
  "name": "Pawfect Pet Supplies POS",
  "short_name": "Pawfect POS",
  "description": "Mobile point of sale for pet retailers",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "orientation": "portrait-primary",
  "background_color": "#F5F1E8",
  "theme_color": "#7BA886",
  "icons": [
    {
      "src": "/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ]
}
```

#### **Payment Processor Integration** *(Future Enhancement)*

To add monetized tiers and premium features:

```tsx
// Example: Stripe/Paddle integration for premium analytics
import { loadStripe } from '@stripe/js';

const handleSubscribe = async (planId: 'pro' | 'enterprise') => {
  const stripe = await loadStripe(VITE_STRIPE_PUBLISHABLE_KEY);
  
  const { sessionId } = await fetch('/api/create-checkout-session', {
    method: 'POST',
    body: JSON.stringify({ planId, userId: cashierId })
  }).then(r => r.json());
  
  await stripe.redirectToCheckout({ sessionId });
};

// Protected: Advanced reports only for Pro tier
{userTier === 'pro' && <AdvancedReportsDashboard />}
```

Currently, this POS system is **license-based** (deployed directly to your Supabase + hosting). To add subscription tiers:
- Integrate Stripe or Paddle for payment processing
- Add tier-based feature flags in the database
- Gate premium reports, bulk export, and API access by subscription level

---

## 🔧 Development Scripts

```bash
# Local development with HMR
npm run dev

# Production build (minified, optimized)
npm run build

# Preview production build locally
npm run preview

# Generate test plan spreadsheet
npm run test-plan:xlsx
```

---

## 📱 Browser & Device Support

| Browser | Version | Support | Notes |
|---------|---------|---------|-------|
| Chrome | 90+ | ✅ Full | PWA install, offline sync |
| Firefox | 88+ | ✅ Full | PWA install, offline sync |
| Safari | 14+ | ✅ Full | PWA on iOS 15+, offline limited |
| Edge | 90+ | ✅ Full | Identical to Chrome |

**Device Requirements:**
- Minimum screen: 320px wide (mobile phones)
- Recommended: 1024px+ (tablets, landscape orientation for 2-column checkout)
- Offline: Requires browser with IndexedDB support (all modern browsers)

---

## 🔒 Security Best Practices

1. **Environment Secrets**: Store `VITE_SUPABASE_ANON_KEY` securely; regenerate if exposed
2. **RLS Policies**: Supabase enforces row-level security; a cashier can only modify their own transactions
3. **Rate Limiting**: Implement API rate limits via Supabase database functions for checkout (prevent abuse)
4. **HTTPS Only**: Always deploy to HTTPS; service workers require secure context
5. **JWT Expiration**: Supabase JWTs expire after 1 hour; refresh tokens are auto-managed

---

## 🤝 Contributing & Support

For issues, feature requests, or questions:

1. Check existing [issues](./issues)
2. Review [DESIGN_GUIDE.md](./DESIGN_GUIDE.md) for UI/UX standards
3. Run test plan: `npm run test-plan:xlsx`
4. Contact the development team for access to staging Supabase project

---

## 📄 License

**All Rights Reserved© 2025 Pawfect Pet Supplies**

This software is proprietary and confidential. Unauthorized copying, modification, or distribution is prohibited.

---

## 🎨 Design & Attribution

- **Design System**: Figma-first component library (see [DESIGN_GUIDE.md](./DESIGN_GUIDE.md))
- **UI Components**: Radix UI primitives, styled with Tailwind CSS
- **Icons**: Lucide React icon set
- **Charts**: Recharts for data visualization
- **Typography**: Custom font stack (see [fonts.css](./src/styles/fonts.css))

See [ATTRIBUTIONS.md](./ATTRIBUTIONS.md) for full credits.

---

## 📚 Learning How the App Works

New to the codebase? Read **[docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)** — a guided tour of:

- App bootstrap and routing
- Auth and role-based access
- Offline-first catalog and sale outbox
- Checkout flow (online vs offline)
- Where to start when changing a feature

---

## 🚀 Next Steps

1. **Clone & Install**: Follow the "Local Development" section above
2. **Read the architecture guide**: [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)
3. **Configure Supabase**: Set up your database with schema from documentation
4. **Test POS Flow**: Add products, scan barcodes, complete checkouts
5. **Deploy**: Push to Vercel/Netlify and share PWA link with your team
6. **Monitor**: Use Supabase dashboard to track real-time sales and sync status

---

**Happy selling! 🐾**
