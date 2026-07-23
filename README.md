# 🎨 Wake Up Makeup — Backend API

> **NestJS + MongoDB** based complete backend for a Makeup & Beauty E-Commerce platform  
> Supports: Products, Orders, Services, Courses, Influencer Affiliate System, Quick Delivery, AI Chatbot & much more.

---

## 📋 Table of Contents

1. [Tech Stack](#-tech-stack)
2. [Project Structure](#-project-structure)
3. [Environment Variables Setup](#-environment-variables-setup)
4. [Installation & Running](#-installation--running)
5. [API Base URL & Prefix](#-api-base-url--prefix)
6. [Authentication Flow](#-authentication-flow)
7. [User Roles & Permissions](#-user-roles--permissions)
8. [Modules Overview](#-modules-overview)
9. [Order Flow (Complete)](#-order-flow-complete)
10. [Wallet System](#-wallet-system)
11. [Shiprocket Integration](#-shiprocket-integration)
12. [Influencer & Affiliate System](#-influencer--affiliate-system)
13. [Quick E-Commerce (Local Delivery)](#-quick-e-commerce-local-delivery)
14. [Notification System & Cron Jobs](#-notification-system--cron-jobs)
15. [AI Chatbot](#-ai-chatbot)
16. [Courses System](#-courses-system)
17. [Service Booking System](#-service-booking-system)
18. [Admin Panel](#-admin-panel)
19. [Key API Endpoints](#-key-api-endpoints)
20. [Database Collections](#-database-collections)
21. [Error Handling & Response Format](#-error-handling--response-format)

---

## 🛠 Tech Stack

| Category | Technology |
|----------|-----------|
| Framework | NestJS v11 |
| Language | TypeScript |
| Database | MongoDB (Mongoose v9) |
| Auth | JWT + Google OAuth2 (passport-jwt) |
| Password | bcryptjs |
| Shipping | Shiprocket API |
| AI | Groq SDK (LLaMA 3.1-8b-instant) |
| Email | Nodemailer (Gmail SMTP) |
| File Upload | Multer (local) + Cloudinary |
| PDF | PDFKit |
| Scheduler | @nestjs/schedule (Cron Jobs) |
| Logger | Winston + winston-daily-rotate-file |
| Validation | class-validator + class-transformer |
| HTTP Client | @nestjs/axios |
| Geocoding | Google Maps API |

---

## 📁 Project Structure

```
src/
├── main.ts                    ← App bootstrap & global middleware
├── app.module.ts              ← Root module (all 23 modules registered)
├── constants.ts               ← Global constants
│
├── auth/                      ← JWT auth, Google OAuth, OTP-based flows
│   ├── auth.controller.ts
│   ├── auth.service.ts        ← Register, Login, Google, OTP, Reset Password
│   ├── jwt.strategy.ts        ← JWT validation strategy
│   ├── jwt-auth.guad.ts       ← JwtAuthGuard
│   ├── roles.guard.ts         ← RolesGuard (@Roles decorator)
│   ├── admin-permission.guards.ts ← Admin module-level access guard
│   └── dto/                   ← RegisterDTO, LoginDTO, GoogleLoginDTO, etc.
│
├── user/                      ← User CRUD, profile management
├── vendor/                    ← Vendor onboarding, products, payouts
├── product/                   ← Products, categories, variants
├── cart/                      ← Shopping cart
├── order/                     ← Main order engine (most complex module)
│   ├── order.service.ts       ← placeOrder(), cancelOrder(), userOrders()
│   └── schema/
│       ├── order.schema.ts        ← Order, OrderItem, AppliedCoupon, ShippingAddress
│       ├── vendor-order.schema.ts ← VendorOrder (split by vendor)
│       ├── vendor-shipment.schema.ts
│       └── refund.schema.ts
│
├── address/                   ← Delivery addresses
├── coupon/                    ← Discount coupons & usage tracking
├── shiprocket/                ← Shipping API integration (token caching)
├── influencer/                ← Influencer profiles + affiliate tracking
│   ├── influencer.service.ts
│   ├── affiliate-tracking.service.ts  ← trackClick, trackSignup, createPendingCommission
│   ├── affiliate-program.service.ts
│   └── affiliate-dashboard.service.ts
│
├── wallet/                    ← User wallet, platform wallet, cashback slabs
│   ├── service/
│   │   ├── user/user.wallet.service.ts  ← addBalance, deductBalance, initializeWallet
│   │   └── platform/platform.wallet.service.ts
│   └── schema/
│       ├── user/              ← UserWallet, WalletTransaction, UserWalletTopup
│       ├── platform/          ← PlatformWallet, PlatformWalletTransaction
│       └── cashback/          ← CashbackSlab
│
├── payout/                    ← Vendor & influencer payouts, bank accounts
├── courses/                   ← Educator courses, sections, lessons, enrollment
├── ai-features/               ← Groq LLaMA chatbot with DB history
├── notification/              ← In-app + email notifications, campaigns, cron jobs
├── quick-e-commerce/          ← Fast local delivery (separate order system)
├── dashboard/                 ← Admin analytics dashboard
├── ticket/                    ← Support tickets
├── wishlist/                  ← Product wishlist
├── user-review/               ← Product reviews + star ratings
├── service/                   ← Beauty service providers, bookings, quotations
├── document/                  ← File/media upload management
├── admin/                     ← Admin panel (user mgmt, commissions, seeder)
│
├── common/
│   ├── responses/
│   │   ├── api-response.ts        ← Standard ApiResponse class
│   │   ├── response.interceptor.ts← Auto-wraps all responses
│   │   └── exception-filter.ts    ← Global error handler
│   └── logger/
│       └── winston.logger.ts
│
└── utils/
    ├── helper.ts              ← generateOTP, sendMail, toSlug, geocodePincode, etc.
    ├── email.template.ts      ← HTML email templates
    ├── service.email.template.ts
    └── encryption.util.ts
```

---

## ⚙️ Environment Variables Setup

Create a `.env` file in the project root with the following variables:

```env
# ─── SERVER ──────────────────────────────────────────
NODE_ENV=development           # 'development' | 'production'
PORT=9000

# ─── DATABASE ────────────────────────────────────────
# Used when NODE_ENV=development
LOCAL_MONGO_URI=mongodb://localhost:27017/wakeup-makeup?replicaSet=rs0

# Used when NODE_ENV=production
MONGO_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/wakeup-makeup

# ─── JWT ─────────────────────────────────────────────
JWT_SECRET=your_jwt_secret_here

# ─── EMAIL (Gmail SMTP) ───────────────────────────────
GMAIL_USER=your_email@gmail.com
GMAIL_PASS=your_app_password     # Gmail App Password (not actual password)

# ─── GOOGLE OAUTH ─────────────────────────────────────
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# ─── SHIPROCKET ───────────────────────────────────────
SHIPROCKET_USER_EMAIL=your_shiprocket_email
SHIPROCKET_USER_PASSWORD=your_shiprocket_password
SHIPROCKET_USER_URL=https://apiv2.shiprocket.in/v1/external

# ─── FILE STORAGE ─────────────────────────────────────
STORAGE_USED=local             # 'local' | 'cloudinary'
UPLOAD_DIR=/var/www/uploads    # Only for production with local storage

# Cloudinary (if STORAGE_USED=cloudinary)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# ─── AI / GROQ ────────────────────────────────────────
GROQ_API_KEY=your_groq_api_key

# ─── GOOGLE MAPS ──────────────────────────────────────
GOOGLE_MAPS_API_KEY=your_maps_api_key

# ─── SERVER BASE URL ──────────────────────────────────
SERVER_BASE_URL=https://yourdomain.com/api
```

> ⚠️ **Note:** `LOCAL_MONGO_URI` requires MongoDB Replica Set (`?replicaSet=rs0`) because the Order module uses **MongoDB Transactions**, which only work with replica sets.

### How to enable Replica Set locally (MongoDB)
```bash
# Add to mongod.conf:
replication:
  replSetName: "rs0"

# Then in mongo shell:
rs.initiate()
```

---

## 🚀 Installation & Running

```bash
# 1. Install dependencies
npm install

# 2. Development mode (hot reload)
npm run start:dev

# 3. Production build
npm run build
npm run start:prod

# 4. Debug mode
npm run start:debug

# 5. Run tests
npm run test

# 6. Lint & format
npm run lint
npm run format
```

---

## 🌐 API Base URL & Prefix

```
All routes are prefixed with: /api/v1

Example:
  POST /api/v1/auth/register
  POST /api/v1/auth/login
  POST /api/v1/orders/place-order
  GET  /api/v1/products
```

**Static file serving:**
```
GET /uploads/<filename>
```
Files are served from `uploads/` folder (local) or `/var/www/uploads` (production).

---

## 🔐 Authentication Flow

### Standard Registration + Login

```
1. POST /api/v1/auth/register
   Body: { name, email, password, phone?, roles? }
   → Sends OTP to email (10 min expiry)

2. POST /api/v1/auth/verify-email
   Body: { email, otp }
   Cookie: referralCode (optional — for affiliate tracking)
   → Verifies OTP → creates wallet for USER role

3. POST /api/v1/auth/login
   Body: { email, password }
   → Returns: { safeUser, access_token, moduleAccess? }
   → Use access_token as: Authorization: Bearer <token>
```

### Google OAuth Login
```
POST /api/v1/auth/google
Body: { idToken }
→ Verifies with Google → creates/updates user → returns JWT
```

### Forgot Password
```
POST /api/v1/auth/send-forgot-password-otp
Body: { email }

POST /api/v1/auth/verify-forgot-password-otp
Body: { email, otp, newPassword, confirmPassword }
```

### Reset Password (Logged in)
```
POST /api/v1/auth/reset-password           [JWT Required]
Body: { email, oldPassword, newPassword, confirmPassword }
```

### Resend OTP
```
POST /api/v1/auth/send-verify-email-otp
Body: { email }
```

---

## 👤 User Roles & Permissions

### Available Roles
```
USER              ← Default role for all registered users
VENDOR            ← Sells products on platform (requires admin approval)
INFLUENCER        ← Promotes products via affiliate codes (requires admin approval)
SERVICE_PROVIDER  ← Offers beauty services (requires admin approval)
EDUCATOR          ← Creates and sells courses (requires admin approval)
DISTRIBUTOR       ← Distributor role
DELIVERY_PERSON   ← Local delivery agent (Quick E-Commerce)
ADMIN             ← Admin panel access (created by SUPER_ADMIN)
SUPER_ADMIN       ← Full access
```

### Role Status (Per User Per Role)
```
NOT_ONBOARDED → User registered but hasn't filled onboarding form
PENDING       → Onboarding submitted, waiting for admin approval
APPROVED      → Role is active and usable
REJECTED      → Admin rejected the role application
DEACTIVATED   → Admin deactivated this role
```

### Guards Used
```
JwtAuthGuard          → Validates Bearer token (most routes)
RolesGuard            → Checks @Roles(UserRole.VENDOR) decorator
AdminPermissionGuard  → Checks admin.moduleAccess (READ/WRITE per module)
OptionalAuthGuard     → Passes even without token (public + user routes)
```

---

## 📦 Modules Overview

| Module | Description | Key Files |
|--------|-------------|-----------|
| **Auth** | Login, Register, Google OAuth, OTP, JWT | `auth.service.ts`, `jwt.strategy.ts` |
| **User** | User profile, role management | `user.service.ts` |
| **Vendor** | Business onboarding, product management | `vendor.service.ts` |
| **Product** | CRUD for products, categories, variants | `product.service.ts` |
| **Cart** | Add/remove items from cart | Cart service |
| **Order** | Place order, cancel, vendor-split | `order.service.ts` (41KB) |
| **Address** | User delivery addresses | Address service |
| **Coupon** | Create/validate discount codes | Coupon service |
| **Shiprocket** | Auto-fetch shipping rates & couriers | `shiprocket.service.ts` |
| **Influencer** | Affiliate tracking, commission, dashboard | Multiple services |
| **Wallet** | User wallet balance, transactions, cashback | `user.wallet.service.ts` |
| **Payout** | Vendor/influencer payouts, bank accounts | `payout.service.ts` |
| **Courses** | Create/sell online courses | Multiple services |
| **AI Features** | LLaMA-powered chatbot with history | `ai-features.service.ts` |
| **Notification** | In-app + email + campaign + cron jobs | `notification.service.ts` |
| **Quick E-Com** | Fast local delivery system | Multiple controllers |
| **Dashboard** | Admin analytics & stats | `dashboard.service.ts` |
| **Service** | Beauty service booking | `service.service.ts` (58KB) |
| **User Review** | Product reviews & ratings | User review service |
| **Wishlist** | Save products for later | Wishlist service |
| **Ticket** | Customer support tickets | Ticket service |
| **Document** | Media/file uploads | Document service |
| **Admin** | Full admin control | `admin.service.ts` (69KB) |

---

## 🛒 Order Flow (Complete)

### Place Order — `POST /api/v1/orders/place-order` `[JWT Required]`

```
Request Body:
{
  addressId: string,
  items: [{ productId, variantId, quantity }],
  paymentMethod: "CashOnDelivery" | "Online" | "Wallet" | "WalletPlusOnline" | "WalletPlusCOD",
  couponCode?: string
}
```

**Internal Flow (MongoDB Transaction):**

```
Step 1 → Validate user's address
Step 2 → Validate items (no duplicate variants)
Step 3 → Group items by vendor (VendorBuckets)
         ├─ Validate product exists & is active
         ├─ Validate variant belongs to product
         └─ Check stock availability

Step 4 → Resolve coupon (if provided)
         ├─ Check: coupon not valid for COD
         ├─ Validate scope (platform/vendor)
         ├─ Check date validity (startsAt/expiresAt)
         ├─ Check usage limits (total + per user)
         └─ Fetch influencer if it's influencer coupon

Step 5 → Per-Vendor Processing:
         ├─ Get shipping from Shiprocket API
         │   (pickupPincode → deliveryPincode, best surface courier auto-selected)
         ├─ Calculate discount per vendor (PERCENTAGE or FIXED proportional)
         ├─ Distribute discount across items proportionally
         ├─ Calculate platform commission
         │   (default 25% on PROFIT_VALUE, configurable from Admin)
         ├─ Calculate vendor payout amount
         └─ Create VendorOrder document

Step 5.5 → Wallet deduction (if paymentMethod includes Wallet)
           ├─ WALLET        → Full amount from wallet
           ├─ WALLET+ONLINE → Available wallet balance used, rest online
           └─ WALLET+COD    → 20% advance from wallet

Step 6 → Create main Order document (with vendorOrder refs)
Step 7 → Create PaymentTransaction records (per vendor, per payment type)
Step 7.5 → Link vendorOrders back to main order (orderId)
Step 7.6 → Create InfluencerCommission records (if coupon is influencer's)
Step 8 → Record CouponUsage + increment coupon.totalUsed
Step 9 → Cashback calculation (online payments only)
         └─ Find applicable CashbackSlab → credit to wallet

Step 10 → Track affiliate commission
Step 11 → COMMIT transaction
Step 12 → Send notifications (user + all vendors)
```

### Order Status Lifecycle
```
PENDING → CONFIRMED → PROCESSING → PARTIALLY_SHIPPED / SHIPPED
                                 → PARTIALLY_DELIVERED / DELIVERED
                                 → PARTIALLY_CANCELLED / CANCELLED
                                 → PARTIALLY_RETURNED / RETURNED
```

### Payment Methods
```
CashOnDelivery      → PaymentStatus: PENDING
Online              → PaymentStatus: PAID
Wallet              → Full wallet deduction → PaymentStatus: PAID
WalletPlusOnline    → Partial wallet + rest online → PaymentStatus: PAID
WalletPlusCOD       → 20% wallet advance + rest COD → PaymentStatus: PENDING
```

---

## 💰 Wallet System

### Wallet Transaction Reasons
```
ADD_MONEY            ← User tops up wallet
ORDER_PAYMENT        ← Used for order payment
COURSE_PAYMENT       ← Used for course purchase
BOOKING_PAYMENT      ← Used for service booking
BOOKING_ADVANCE_PAYMENT
CASHBACK             ← Earned after order delivery
REFUND               ← Order cancelled refund
REFERRAL_BONUS       ← Referral earnings
ADMIN_ADJUSTMENT     ← Manual admin credit/debit
```

### Cashback Slabs (Configurable by Admin)
```
CashbackSlab {
  minValue: 500,    maxValue: 999,
  cashbackType: PERCENTAGE, cashbackValue: 5, maxCashback: 50
}
→ Order ₹699 → Cashback = 5% = ₹34.95 credited to wallet
```

### Wallet APIs
```
GET  /api/v1/wallet/balance            [JWT]  → Current balance
GET  /api/v1/wallet/transactions       [JWT]  → Transaction history
POST /api/v1/wallet/initiate-topup     [JWT]  → Add money to wallet
```

---

## 🚚 Shiprocket Integration

```
Token Management:
  → Token stored in DB (ShiprocketToken collection)
  → Expires in 9 days → auto-regenerated on next request

Courier Selection Logic:
  → Filter: is_surface === true (road/surface couriers only)
  → Sort: tracking_performance DESC, etd_hours ASC
  → Pick best courier automatically

Data returned:
  courierName, shippingCharge, codCharge,
  estimatedDays, estimatedDate, rtoCharges, isCODAvailable
```

---

## 🌟 Influencer & Affiliate System

### Affiliate Program Flow
```
1. Influencer gets approved → Affiliate program created with unique referralCode

2. User clicks influencer's link (with ?ref=CODE in URL or cookie)
   POST /api/v1/affiliate-tracking/track-click
   → Tracks click (deduped by IP)

3. User registers (referralCode stored in cookie)
   → On email verify → trackSignup() called
   → AffliateSignup record created
   → User linked to influencer

4. User places order using influencer's coupon code
   → InfluencerCommission created (PENDING)
   → Commission rate from coupon/influencer slab

5. Admin approves commission → PAID
   → Influencer payout created
```

### Coupon Types for Influencer
```
Coupon.influencerId is set → Influencer coupon
→ Discount applied to buyer
→ Commission tracked for influencer
→ Cannot be used with COD
```

---

## ⚡ Quick E-Commerce (Local Delivery)

A **separate delivery system** for fast local/same-day delivery.

```
Vendor enables quickCommerce:
  { enabled: true, acceptingOrders: true, serviceRadius: 5km,
    maxConcurrentOrders: 20, defaultPreparationTime: 10min }

User → Quick Cart → Quick Checkout → Quick Order placed
    ↓
Vendor accepts order
    ↓
System assigns available DeliveryPerson (near vendor, within radius)
    ↓
Delivery person picks up → delivers → confirms
    ↓
Platform commission deducted → Delivery person earnings credited
```

**Key Schemas:**
- `QuickOrder` — Main quick delivery order
- `VendorQuickOrder` — Vendor's view of the order
- `DeliveryPerson` — Delivery agent profile
- `DeliveryPersonAssignment` — Order ↔ Agent mapping
- `QuickDeliveryCart` — Separate cart for quick orders
- `QuickDeliveryConfiguration` — Service zones, fees, settings

---

## 🔔 Notification System & Cron Jobs

### Notification Types
```
SYSTEM         ← Platform-triggered (order placed, wallet credited, etc.)
TRANSACTIONAL  ← User action triggered (cancel, review, etc.)
PROMOTIONAL    ← Marketing campaigns
```

### Automated Cron Jobs
```
Every Minute  → handleScheduledCampaigns()
  └─ Process campaigns with scheduledAt <= now (one-time)

Every Day 8AM → handleServiceBookingReminders()
  └─ Send reminders for bookings today & tomorrow

Every Day 9AM → handleRecurringCampaigns()
  └─ Send recurring notification campaigns
```

### Campaign System (Admin)
```
Admin creates campaign:
  { title, body, targetRoles: ['user','vendor'], sendOption: ['IN_APP','EMAIL'],
    scheduledAt?: Date, isRecurring: boolean }

→ No scheduledAt → Sends immediately
→ scheduledAt set → Cron job sends at that time
→ isRecurring → Sends every day at 9AM
```

### Product Restock Notification
```
When vendor restocks a product:
  → Check ProductNotify collection (users who subscribed)
  → Send "Back in Stock" notification to all subscribed users
```

---

## 🤖 AI Chatbot

```
POST /api/v1/ai/chat
Body: { query: "What lipstick should I buy?" }
Headers: Authorization: Bearer <token>   (optional — works for guests too)

Response: { reply: "Based on your skin tone..." }
```

**Features:**
- Model: `llama-3.1-8b-instant` (via Groq API)
- Personalized system prompt based on user profile
- Conversation history stored in DB (last 20 messages)
- Works for both logged-in users and guests

---

## 🎓 Courses System

### Structure
```
Educator → creates → Course
                     ├── CourseSection (Chapter 1, Chapter 2...)
                     │     └── CourseLesson (Video/Text)
                     │           └── CourseAttachment (PDF, file)
                     ├── CourseReview (ratings)
                     └── CourseComment + CourseReply (discussions)

User → Enrolls via wallet/online payment → gets access
```

### Educator Onboarding
```
User registers → applies for EDUCATOR role
→ Admin approves → EducatorStatus: ACTIVE
→ Educator can create & publish courses
→ Platform commission deducted on each enrollment
```

---

## 💆 Service Booking System

### Service Provider Flow
```
ServiceProvider → creates → Service
                             ├── ServiceAvailability (Mon-Sun schedule)
                             ├── ServiceSlot (specific time slots)
                             └── ServiceStaff (who handles bookings)

User → books service → ServiceBooking created
     ↓
ServiceProvider accepts → Booking CONFIRMED
     ↓
Service completed → COMPLETED
     ↓
User reviews → ServiceReview
```

### Additional Features
- **ServiceLead** — Inquiry before booking
- **ServiceQuotation** — Custom quote for services
- **RentalService** — Equipment rentals
- **ServiceSubscription** — Recurring service plans

---

## 👑 Admin Panel

### Admin Module Access Control
```
Admin user has moduleAccess: [
  { module: 'USERS', access: ['READ', 'WRITE'] },
  { module: 'FINANCE', access: ['READ'] },
  ...
]
```

### Available Admin Modules
```
USERS           ← Manage all users, approve/reject roles
VENDORS         ← Approve/reject vendors
COURSES         ← Manage courses & educators
SERVICE_PROVIDERS ← Manage service providers
INFLUENCERS     ← Approve/reject influencers
FINANCE         ← Payouts, transactions, commissions
PLATFORM        ← Platform settings, commissions, cashback
```

### Commission Rate (Platform Configurable)
```
CommissionRate collection (single document):
  commissions: [
    { entityType: 'VENDOR', commissionOn: 'PROFIT_VALUE', commissionPercentage: 25 },
    { entityType: 'EDUCATOR', commissionOn: 'SALE_VALUE', commissionPercentage: 15 },
    { entityType: 'SERVICE_PROVIDER', commissionOn: 'SALE_VALUE', commissionPercentage: 20 },
    ...
  ]

Default: 25% on PROFIT_VALUE (if no config found)
```

---

## 📡 Key API Endpoints

### Auth
```
POST /api/v1/auth/register
POST /api/v1/auth/login
POST /api/v1/auth/google
POST /api/v1/auth/verify-email
POST /api/v1/auth/send-verify-email-otp
POST /api/v1/auth/send-forgot-password-otp
POST /api/v1/auth/verify-forgot-password-otp
POST /api/v1/auth/reset-password              [JWT]
```

### Orders
```
POST /api/v1/orders/place-order              [JWT]
GET  /api/v1/orders/user-orders              [JWT]
GET  /api/v1/orders/:id                      [JWT]
PUT  /api/v1/orders/cancel-order/:id         [JWT]
```

### Products
```
GET  /api/v1/products                        (public)
GET  /api/v1/products/:slug                  (public)
POST /api/v1/products                        [JWT, VENDOR]
PUT  /api/v1/products/:id                    [JWT, VENDOR]
```

### Cart
```
POST /api/v1/cart/add
GET  /api/v1/cart
DELETE /api/v1/cart/:itemId
DELETE /api/v1/cart/clear
```

### Wallet
```
GET  /api/v1/wallet/balance                  [JWT]
GET  /api/v1/wallet/transactions             [JWT]
POST /api/v1/wallet/initiate-topup           [JWT]
```

### Notifications
```
GET  /api/v1/notifications                   [JWT]
PUT  /api/v1/notifications/:id/read          [JWT]
POST /api/v1/notifications/register-product-notify [JWT]
```

### AI Chat
```
POST /api/v1/ai/chat                         [Optional JWT]
Body: { query: string }
```

### Shipping
```
GET  /api/v1/shiprocket/check-serviceability  (with query params)
```

---

## 🗄️ Database Collections

| Collection | Schema | Description |
|-----------|--------|-------------|
| `users` | User | All user accounts |
| `vendors` | Vendor | Vendor profiles |
| `products` | Product | Product listings |
| `productvariants` | ProductVariant | SKUs with stock & pricing |
| `categories` | Category | Product categories |
| `orders` | Order | Main orders |
| `vendororders` | VendorOrder | Vendor-split orders |
| `coupons` | Coupon | Discount codes |
| `couponusages` | CouponUsage | Coupon usage tracking |
| `influencers` | Influencer | Influencer profiles |
| `influencercommissions` | InfluencerCommission | Per-order commission |
| `affliateprograms` | AffliateProgram | Affiliate programs |
| `affliatesignups` | AffliateSignup | User referral signups |
| `affliatecommissions` | AffliateCommission | Affiliate earnings |
| `userwallets` | UserWallet | User wallet balances |
| `wallettransactions` | WalletTransaction | All wallet movements |
| `cashbackslabs` | CashbackSlab | Cashback rules |
| `shiprockettokens` | ShiprocketToken | Cached API token |
| `notifications` | Notification | All notifications |
| `notificationcampaigns` | NotificationCampaign | Marketing campaigns |
| `productnotifies` | ProductNotify | Restock subscriptions |
| `admins` | Admin | Admin access control |
| `commissionrates` | CommissionRate | Platform commission config |
| `serviceproviders` | ServiceProvider | Service provider profiles |
| `services` | Service | Beauty services |
| `servicebookings` | ServiceBooking | Service appointments |
| `courses` | Course | Online courses |
| `courseenrollments` | CourseEnrollment | User enrollments |
| `educators` | Educator | Educator profiles |
| `aichathistories` | AIChatHistory | AI conversation history |
| `quickorders` | QuickOrder | Quick delivery orders |
| `deliverypersons` | DeliveryPerson | Delivery agents |
| `paymenttransactions` | PaymentTransaction | Payment audit trail |
| `vendorpayouts` | VendorPayout | Vendor settlements |
| `bankaccounts` | BankAccount | Payout bank details |
| `userreviews` | UserReview | Product reviews |
| `tickets` | Ticket | Support tickets |
| `wishlists` | Wishlist | User wishlists |

---

## 📤 Error Handling & Response Format

### Standard Success Response
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Order placed successfully",
  "data": { ... }
}
```

### Standard Error Response
```json
{
  "success": false,
  "statusCode": 400,
  "message": "Invalid OTP"
}
```

### HTTP Status Codes Used
| Code | When |
|------|------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request (validation, invalid data) |
| 401 | Unauthorized (invalid/missing JWT) |
| 403 | Forbidden (insufficient role/permission) |
| 404 | Not Found |
| 406 | Not Acceptable (inactive account) |
| 409 | Conflict (duplicate, already exists) |
| 500 | Internal Server Error |

---

## 🔑 Important Business Rules

```
1. Coupon cannot be used with Cash on Delivery
2. Vendor orders are always split from the main order (1 order → N vendor orders)
3. Stock decrement uses atomic $gte check to prevent overselling
4. MongoDB transactions used for: placeOrder(), cancelOrder()
   → If anything fails, full rollback happens
5. Cancelled paid orders → full refund to wallet automatically
6. WALLET+COD requires minimum 20% advance from wallet
7. Platform commission default = 25% on profit value
8. Shiprocket token cached in DB for 9 days (auto-refresh)
9. Influencer coupon generates InfluencerCommission record (PENDING → PAID)
10. Email verification OTP expires in 10 minutes
11. User wallet initialized automatically on email verification
12. AI chat history limited to last 20 messages in DB
13. Product restock → auto-notify subscribed users
```

---

## 🧪 Development Notes

```bash
# MongoDB replica set is REQUIRED for transactions
# Run this once in mongo shell:
rs.initiate()

# Check if replica set is running:
rs.status()

# Default admin user seeding
POST /api/v1/admin/seed   ← Seeds default SUPER_ADMIN
```

---

## 📞 Allowed CORS Origins

```
Development: http://localhost:5173
Production:  https://wakeup-makeup.com
```

---

## 📝 Scripts Reference

```bash
npm run start:dev    # Development with hot reload
npm run start:prod   # Production (after build)
npm run build        # Compile TypeScript
npm run lint         # ESLint fix
npm run format       # Prettier format
npm run test         # Unit tests (Jest)
npm run test:cov     # Coverage report
```

---

*Made with ❤️ by Wake Up Makeup Dev Team*
