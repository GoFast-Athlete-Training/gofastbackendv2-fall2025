# Company Outlook Architecture

**Last Updated**: January 2025  
**Purpose**: Comprehensive architecture documentation for Company Outlook platform - company-first schema with separate auth and product CRM focus

---

## Platform Vision

**Company Outlook is "The Operating System for Founders"** - A comprehensive company management platform where founders can:
- **Manage** their company operations, finances, and roadmaps
- **Prospect** and convert contacts into users (athletes) or sales channel partners
- **Track** financial health with actual spending and projections
- **Plan** product, GTM, and operations roadmaps
- **Coordinate** team tasks and priorities

**Core Value**: **Company-first operations** - Everything centers around the Company container, with separate auth (Owner model) and clear separation from athlete identity.

---

## Core Philosophy: Company-First Architecture

Company Outlook is built on a **company-first schema** where the `Company` model (CompanyHQ) is the central container entity. All other models and features link back to `Company` as the source of truth.

**Key Principle**: **Separate auth from athlete identity** - The `Owner` model handles authentication (Firebase), completely separate from `Athlete` model. This enables:
- Company operations without requiring athlete signup
- Prospect → User conversion path (contacts can become athletes later)
- Sales channel partner management (separate from athlete users)

### Company as Central Container

```
Company (CompanyHQ - Root Container)
  ├── Owner (Firebase Auth - Separate from Athlete)
  ├── Employees (Email-based, NO athleteId)
  ├── Invites (Invitation-based access)
  ├── CRM Contacts (Prospects → Users/Athletes/Partners)
  ├── Financial Data (Spends, Projections)
  ├── Roadmap Items (Product, GTM, Ops)
  ├── Tasks (Company-wide)
  └── [Future: Products, Deals, Integrations]
```

**Note**: `Owner` is for Company Outlook authentication - separate from `Athlete` identity. See Identity Architecture section below.

---

## Database Schema Architecture

### Owner Model (Company Auth - Firebase)

**Location**: `prisma/schema.prisma`

**Core Fields**:
- `id`: Unique identifier (cuid)
- `firebaseId`: Firebase authentication ID (unique)
- `email`: Email identifier
- Universal profile fields (name, photoURL, etc.)

**Integration Fields**:
- Firebase OAuth fields (from Firebase auth)
- Company ownership fields (via CompanyHQ relations)

**Relations**:
- `ownedCompanies`: One-to-many → `CompanyHQ[]` (companies this owner created)
- `managedCompanies`: One-to-many → `CompanyHQ[]` (companies this owner manages)

**Design Decisions**:
- ✅ **Owner is source of truth for auth** - All authentication flows through Owner
- ✅ **Separate from Athlete** - Owner is NOT an athlete extension
- ✅ **Firebase-based** - Uses Firebase for authentication
- ✅ **Company-scoped** - Owner can own/manage multiple companies

---

## Identity Architecture

### Core Principle
**You're either a Company Person OR an Athlete - these are separate concerns.**

### Identity Types

#### 1. Owner (Company Auth)
- Company Outlook users (founders, employees, managers)
- Primary identity: `Owner` model (Firebase auth)
- Has access to company tools (CRM, finances, roadmaps, tasks)
- **Separate from Athlete** - Owner is NOT an athlete extension
- **May optionally** link to Athlete if owner is also a runner (future: optional link)

#### 2. Athlete (Separate Concern)
- Real users using GoFast app for fitness/training
- Primary identity: `Athlete` model (separate system)
- Has activities, Garmin integration, RunCrew membership
- **Separate from Owner** - Athlete is NOT a company extension
- **Conversion Path**: Prospect (Contact) → Can become Athlete (if they sign up for GoFast app)

### Model Relationships

**Owner (Company Identity)**:
```
Owner (Firebase Auth)
  ├── CompanyHQ[] (ownedCompanies)
  ├── CompanyHQ[] (managedCompanies)
  └── (No athlete activities - separate concern)
  └── May have optional athleteId link (future - if owner is also a runner)
```

**Athlete (Fitness Identity)**:
```
Athlete (Separate System)
  ├── Activities (Garmin/Strava sync)
  ├── RunCrew Memberships
  └── (No company operations - separate concern)
  └── May be linked from Contact (prospect → athlete conversion)
```

**Contact (Prospect/Partner)**:
```
Contact (CRM - Universal Personhood)
  ├── Pipeline (prospect, client, partner, athlete)
  ├── Can convert to Athlete (if they sign up for GoFast)
  ├── Can become Sales Channel Partner (separate model)
  └── Lives under CompanyHQ (company-scoped)
```

### Prospect → User Conversion Path

**Key Architecture**: Contacts (prospects) can convert into:
1. **Athlete Users** - If prospect signs up for GoFast app
2. **Sales Channel Partners** - If prospect becomes a partner
3. **Clients** - If prospect becomes a paying client

**Conversion Flow**:
```
Contact (Prospect)
  ↓
Pipeline Update: pipeline = "converted"
  ↓
Option A: Contact → Athlete (if they sign up for GoFast)
  - Create Athlete record (separate system)
  - Link Contact.athleteId = Athlete.id (optional link)
  - Contact remains in CRM, now linked to Athlete

Option B: Contact → Partner (if they become sales channel)
  - Create Partner record (future model)
  - Link Contact.partnerId = Partner.id
  - Contact remains in CRM, now linked to Partner

Option C: Contact → Client (if they become paying client)
  - Update Pipeline: pipeline = "client", stage = "active"
  - Create Deal/Contract records (future models)
  - Contact remains in CRM, now marked as client
```

**Key Points**:
- Contact is universal personhood - stays in CRM regardless of conversion
- Conversion creates links to other systems (Athlete, Partner, Client)
- Contact can have multiple links (e.g., Athlete + Partner)
- All conversions tracked via Pipeline model

---

## Data Models (Prisma Schema)

### Company Model (CompanyHQ - Root Container)

```prisma
model Company {
  id        String @id @default(cuid())
  name      String
  address   String?
  website   String?
  
  // Ownership & Management
  ownerId   String   // Super admin - literal owner (required)
  owner     Owner    @relation("OwnerOf", fields: [ownerId], references: [id])
  managerId String?  // Manager delegated by owner (optional)
  manager   Owner?   @relation("ManagerOf", fields: [managerId], references: [id])
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  // Relations
  founders          CompanyFounder[]
  employees         CompanyEmployee[]
  invites           CompanyInvite[]     // Invitation-based access
  roadmapItems      CompanyRoadmapItem[]
  tasks             Task[]              // Company tasks (companyId set, founderId null)
  crmContacts       CompanyCrmContact[]
  financialSpends   CompanyFinancialSpend[]  // Actual spending
  financialProjections CompanyFinancialProjection[]  // Projected spending
  
  @@map("companies")
}
```

**Key Architecture Point**: CompanyHQ is the root container for multi-tenancy
- **Everything stored under CompanyHQId** - all data is nested under it
- **Owner is NOT a Contact** - ownerId is on Company model, separate from Contact model
- **Data isolation**: Each CompanyHQ can only access their own data

### Owner Model (Company Auth - Firebase)

```prisma
model Owner {
  id          String   @id @default(cuid())
  firebaseId  String   @unique  // Firebase auth ID (for authentication)
  name        String?  // Full name (from Firebase displayName or firstName/lastName)
  email       String?  // Email address (from Firebase)
  photoURL    String?  // Profile photo URL (from Firebase - stored for quick access)
  
  // Reverse relations
  ownedCompanies CompanyHQ[] @relation("OwnerOf")
  managedCompanies CompanyHQ[] @relation("ManagerOf")
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

**Firebase Integration**:
- `firebaseId` = Firebase UID (universal identifier)
- `name` = Parsed from Firebase `displayName` (format: "First Last") or set manually
- `email` = From Firebase auth
- `photoURL` = From Firebase `photoURL` - **Stored in Owner model for quick access** (no need to fetch from Firebase every time)

**Key Architecture Point**: Owner is separate from Athlete
- **NO athleteId** - Owner is NOT an athlete extension
- **Separate auth system** - Uses Firebase, not athlete auth
- **Company-scoped** - Owner can own/manage multiple companies

### CompanyFounder Junction

```prisma
model CompanyFounder {
  id        String @id @default(cuid())
  companyId String
  founderId String // Links to Founder.id → Owner.id (NOT Athlete.id)
  
  role      String? // "CEO", "Co-Founder"
  joinedAt  DateTime @default(now())
  
  company   Company @relation(fields: [companyId], references: [id], onDelete: Cascade)
  founder   Owner   @relation(fields: [founderId], references: [id], onDelete: Cascade)
  
  @@unique([companyId, founderId])
  @@map("company_founders")
}
```

**Key Architecture Point**: Founder links to Owner, NOT Athlete
- `founderId` → `Owner.id` (company auth)
- **NOT** `Athlete.id` (separate system)
- If founder wants to use GoFast app, they sign up separately as Athlete

### CompanyEmployee (Email-Based, NO AthleteId)

```prisma
model CompanyEmployee {
  id          String @id @default(cuid())
  companyId   String
  
  // Employee Info (Email-Based, NO Athlete Required)
  email       String
  name        String
  role        String? // "Engineer", "Designer", "PM"
  department  String?
  phoneNumber String?
  
  joinedAt    DateTime @default(now())
  
  company     Company @relation(fields: [companyId], references: [id], onDelete: Cascade)
  
  // NO athleteId - separate concern!
  // If they want app, they sign up separately as Athlete
  
  @@unique([companyId, email]) // One email per company
  @@map("company_employees")
}
```

### CompanyInvite (Invitation-Based Access)

```prisma
model CompanyInvite {
  id        String @id @default(cuid())
  companyId String
  
  // Invitation Details
  email     String      // Invitee email
  token     String @unique // Unique invitation token (for URL)
  role      String? // "founder", "admin", "manager", "employee"
  department String?
  
  // Invitation Status
  status    String @default("pending") // pending, accepted, expired, revoked
  invitedBy String? // Email of person who sent invite
  acceptedAt DateTime?
  expiresAt  DateTime?
  
  // System
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  company   Company @relation(fields: [companyId], references: [id], onDelete: Cascade)
  
  @@unique([companyId, email, token]) // One active invite per email per company
  @@map("company_invites")
}
```

**Key Architecture Point**: Invitation-based access control
- **Users must be invited** - No open signup
- **Token-based** - Unique token in invitation URL
- **Email + Token** - Verifies both email and valid invitation
- **Role/Department** - Set at invitation time
- **Expiration** - Invites can expire for security

### CompanyCrmContact (Product CRM - Prospects → Users/Partners)

```prisma
model CompanyCrmContact {
  id        String @id @default(cuid())
  companyId String
  
  // Contact Info (Universal Personhood)
  name      String
  role      String? // "Club Director", "Partnership Lead", etc.
  email     String?
  company   String? // Their company (club/organization name)
  phone     String?
  title     String?
  
  // Pipeline Management (Product CRM Focus - Prospects, Users, Partners)
  pipeline  String @default("prospects") // prospects, users, partners, clients, churned
  status    String @default("new") // new, warm, active, exploring, cold
  
  // Conversion Tracking
  athleteId String? // Optional: Link to Athlete if prospect converted to user
  partnerId String? // Optional: Link to Partner if prospect converted to partner (future)
  
  // Next Steps
  nextStep  String? // "Onboarding call", "Contract review", "Integration setup"
  
  // Notes
  notes     String?
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  company   Company @relation(fields: [companyId], references: [id], onDelete: Cascade)
  
  @@map("company_crm_contacts")
}
```

**Key Architecture Point**: Product CRM with conversion tracking
- **Universal Personhood** - Contact represents person across entire journey
- **Conversion Links** - `athleteId` and `partnerId` track conversions
- **Pipeline Tracking** - `pipeline` and `status` track position in funnel
- **Prospect → User Path** - Contact can convert to Athlete (if they sign up for GoFast)
- **Prospect → Partner Path** - Contact can convert to Partner (if they become sales channel)

### CompanyRoadmapItem

```prisma
model CompanyRoadmapItem {
  id          String @id @default(cuid())
  companyId   String // Links to Company, not Founder
  
  roadmapType String // "product", "gtm", "operations"
  quarter     String? // "Q4 2025"
  title       String
  description String?
  status      String @default("pending") // pending, in_progress, completed, cancelled
  dueDate     DateTime?
  completedAt DateTime?
  
  company     Company @relation(fields: [companyId], references: [id], onDelete: Cascade)
  
  @@map("company_roadmap_items")
}
```

### CompanyFinancialSpend (Actual Spending - INDIVIDUAL ITEMS)

```prisma
model CompanyFinancialSpend {
  id          String @id @default(cuid())
  companyId   String
  
  // INGESTED ITEM DATA - What we're ingesting per transaction
  date        DateTime  // When the spend occurred
  amount      Float     // Amount spent (negative for expenses)
  category    String    // "salaries", "marketing", "operations", "software", "office", etc.
  description String?   // Transaction description
  vendor      String?   // Who we paid
  
  // Classification
  department  String?   // Which department (if applicable)
  project     String?   // Which project (if applicable)
  
  // Receipt/Proof
  receiptUrl  String?   // Link to receipt/documentation
  
  // System
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  company     Company @relation(fields: [companyId], references: [id], onDelete: Cascade)
  
  @@map("company_financial_spends")
}
```

**Key Architecture Point**: This model stores **INDIVIDUAL ITEMS** (transactions). 
- **Total Value** = Calculated by aggregating items (SUM by category, period, department, etc.)
- **Aggregation Examples**:
  - Total spending this month: `SUM(amount WHERE date >= startOfMonth)`
  - Total by category: `SUM(amount) GROUP BY category`
  - Total by department: `SUM(amount) GROUP BY department`

**This is why architecture matters** - we need to define:
1. **What individual items are we ingesting?** (This model)
2. **How do we calculate totals?** (Aggregations from items)

### CompanyFinancialProjection (Projected Spending - TOTAL VALUES)

```prisma
model CompanyFinancialProjection {
  id          String @id @default(cuid())
  companyId   String
  
  // Projection Period
  period      String    // "monthly", "quarterly", "yearly"
  periodStart DateTime  // Start of projection period
  periodEnd   DateTime  // End of projection period
  
  // TOTAL VALUES - Aggregated/Projected Amounts (NOT individual items)
  projectedRevenue    Float?  // Projected revenue for period (TOTAL)
  projectedExpenses   Float   // Projected expenses for period (TOTAL)
  projectedNet        Float?  // Projected net (revenue - expenses) (TOTAL)
  
  // Breakdown by Category (TOTAL VALUES per category)
  categoryBreakdown   Json?   // { "salaries": 50000, "marketing": 10000, "operations": 5000 }
  
  // Runway Calculation (TOTAL VALUES)
  currentCash         Float?  // Current cash on hand (TOTAL)
  monthlyBurnRate    Float?  // Monthly burn (expenses) (TOTAL)
  runwayMonths        Float?  // Months of runway (calculated: cash / monthlyBurn)
  
  // Assumptions
  assumptions         String? // Notes on assumptions for this projection
  
  // Status
  status              String @default("draft") // draft, active, archived
  
  // System
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  company     Company @relation(fields: [companyId], references: [id], onDelete: Cascade)
  
  @@map("company_financial_projections")
}
```

**Key Architecture Point**: This model stores **TOTAL VALUES** (aggregated/projected amounts).
- **NOT individual items** - these are summary/aggregated values
- **Ingested as totals** - user enters total projected expenses, total revenue, etc.
- **Different from Spend model** - Spend = items, Projection = totals

### Task (Unified - Owner OR Company)

```prisma
model Task {
  id        String @id @default(cuid())
  
  // Polymorphic Link - ONE of these must be set
  ownerId   String?  // For owner personal tasks (Adam's tasks)
  companyId String?  // For company-wide tasks
  
  // Task Details
  title       String
  description String?
  status      String @default("pending") // pending, in_progress, completed, cancelled
  priority    String @default("medium") // low, medium, high, urgent
  dueDate     DateTime?
  
  // Department (for company tasks)
  department  String? // "Engineering", "Design", "Marketing"
  
  // Owner Priority Flag (for company tasks)
  isTopPriority Boolean @default(false) // Owner can mark "most important now"
  
  // Completion
  completedAt DateTime?
  
  // System
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  // Relations
  owner   Owner?   @relation(fields: [ownerId], references: [id], onDelete: Cascade)
  company Company? @relation(fields: [companyId], references: [id], onDelete: Cascade)
  
  @@map("tasks")
}
```

**Key Architecture Point**: Unified task model
- **Owner tasks** - Personal tasks for owner (ownerId set, companyId null)
- **Company tasks** - Company-wide tasks (companyId set, ownerId null)
- **Avoids duplicate task models** - One model handles both cases

---

## Relationships Summary

### Company Relationships
- `Company` → `Owner` (ownerId - super admin)
- `Company` → `Owner` (managerId - delegated manager)
- `Company` → `CompanyFounder[]` → `Owner` (founders who are owners)
- `Company` → `CompanyEmployee[]` (email-based, NO athleteId)
- `Company` → `CompanyInvite[]` (invitation-based access)
- `Company` → `CompanyRoadmapItem[]` (product/GTM/ops roadmap)
- `Company` → `Task[]` (companyId set, ownerId null)
- `Company` → `CompanyCrmContact[]` (product CRM - prospects → users/partners)
- `Company` → `CompanyFinancialSpend[]` (actual spending transactions)
- `Company` → `CompanyFinancialProjection[]` (projected spending/budgets)

### Financial Model Architecture - Items vs Totals

**CRITICAL ARCHITECTURE PRINCIPLE**: Everything is about **what we're ingesting**

#### CompanyFinancialSpend = INDIVIDUAL ITEMS
- **What we ingest**: Individual transactions, line items, receipts
- **Example**: $500 for software subscription on Jan 15, $2000 for salaries on Jan 20, $100 for office supplies on Jan 25
- **Total Value**: Calculated by aggregating items (SUM by period, category, department)

#### CompanyFinancialProjection = TOTAL VALUES
- **What we ingest**: Total projected amounts, aggregated budgets
- **Example**: $50,000 total projected expenses for Q1, $10,000 total for marketing category
- **Total Value**: Ingested directly as totals (not calculated from items)

**Key Distinction**:
- **Spend Model**: Store individual items → Calculate totals from items
- **Projection Model**: Store totals directly → No items to aggregate

**This is why architecture matters** - we must define:
1. **What are we ingesting?** (Items vs Totals)
2. **How do we calculate totals?** (Aggregation from items, or direct ingestion)

---

## Modular Architecture Patterns

### 1. Modular Route Organization

**Pattern**: Features organized by domain, not by HTTP method

**Key Concept**: Routes are organized by **feature domain**, not by HTTP method. Each feature domain gets a folder with one or more route files.

**Structure**:
```
routes/
├── Owner/           # Owner CRUD & hydration (Firebase auth)
│   ├── ownerCreateRoute.js
│   ├── ownerUpdateRoute.js
│   ├── ownerHydrateRoute.js
│   └── ownerProfileRoute.js
├── Company/         # Company management
│   ├── companyCreateRoute.js
│   ├── companyHydrateRoute.js
│   └── companyUpdateRoute.js
├── CRM/             # Product CRM management
│   ├── crmContactListRoute.js
│   ├── crmContactCreateRoute.js
│   ├── crmContactUpdateRoute.js
│   └── crmContactConvertRoute.js  // Prospect → User/Partner conversion
├── Financial/       # Financial management
│   ├── financialSpendRoute.js
│   └── financialProjectionRoute.js
├── Roadmap/         # Roadmap management
│   └── roadmapRoute.js
├── Task/            # Task management
│   └── taskRoute.js
└── Invite/          # Invitation management
    ├── inviteCreateRoute.js
    ├── inviteVerifyRoute.js
    └── inviteAcceptRoute.js
```

**Naming Convention**:
- **Folder**: PascalCase (`Owner/`, `Company/`, `CRM/`)
- **File**: camelCase + "Route.js" (`ownerCreateRoute.js`, `crmContactListRoute.js`)

**Why This Pattern**:
- ✅ **Grouped by feature** - All related endpoints in one place
- ✅ **Clear naming** - File name describes functionality
- ✅ **Scalable** - Easy to add new route files per feature
- ✅ **No filename conflicts** - PascalCase folder + camelCase file

### 2. Modular Service Layer

**Location**: `services/`

**Purpose**: Business logic separated from route handlers

**Services**:
- `OwnerUpsertService.js` - Universal owner upsert logic
- `OwnerUpdateService.js` - Owner update operations
- `CrmContactService.js` - CRM contact management
- `CrmConversionService.js` - Prospect → User/Partner conversion logic
- `FinancialAggregationService.js` - Financial totals calculation

**Pattern**:
```javascript
// Route handler (thin)
router.post('/create', verifyFirebaseToken, async (req, res) => {
  const result = await OwnerUpsertService.upsert(req.body);
  res.json(result);
});

// Service (business logic)
export class OwnerUpsertService {
  static async upsert(data) {
    // Business logic here
    return await prisma.owner.upsert(...);
  }
}
```

### 3. Database Connection Pattern

**Location**: `config/database.js`

**Pattern**: Centralized Prisma client management

```javascript
// config/database.js
let prismaClient = null;

export async function connectDatabase() {
  if (!prismaClient) {
    prismaClient = new PrismaClient();
    await prismaClient.$connect();
  }
  return prismaClient;
}

export function getPrismaClient() {
  if (!prismaClient) {
    throw new Error('Database not connected. Call connectDatabase() first.');
  }
  return prismaClient;
}
```

**Usage in Routes**:
```javascript
import { getPrismaClient } from '../../config/database.js';

const prisma = getPrismaClient();
const owners = await prisma.owner.findMany();
```

**Never Do This**:
```javascript
// ❌ DON'T create new PrismaClient instances
const prisma = new PrismaClient(); // Wrong!
```

**Why This Pattern**:
- ✅ Single connection pool
- ✅ Prevents connection exhaustion
- ✅ Centralized error handling
- ✅ Graceful shutdown support

---

## Route Architecture

### Owner Routes (Firebase Auth)

```
POST   /api/owner/create              → Find or create Owner by firebaseId
PUT    /api/owner/:id/profile         → Update Owner profile (name, email)
GET    /api/owner/hydrate             → Hydrate Owner with full data (requires token)
```

### Company Routes

```
GET    /api/company/:companyId/hydrate          // Hydrate company + all relations
GET    /api/company/:companyId                 // Get company details
POST   /api/company/create                     // Create company record (requires ownerId)
PUT    /api/company/:companyId                 // Update company
```

### CRM Routes (Product CRM - Prospects → Users/Partners)

```
GET    /api/crm/contacts?companyId={companyId}            // All company CRM contacts
GET    /api/crm/contacts?companyId=X&pipeline=prospects   // Filtered by pipeline
GET    /api/crm/contacts/:contactId                       // Single contact detail
POST   /api/crm/contacts                                  // Create contact
PUT    /api/crm/contacts/:contactId                      // Update contact
DELETE /api/crm/contacts/:contactId                       // Delete contact

POST   /api/crm/contacts/:contactId/convert-to-athlete   // Convert prospect → Athlete user
POST   /api/crm/contacts/:contactId/convert-to-partner   // Convert prospect → Partner (future)
```

**Key Routes**: Conversion endpoints
- `POST /api/crm/contacts/:contactId/convert-to-athlete` - Links Contact to Athlete (if prospect signs up for GoFast)
- `POST /api/crm/contacts/:contactId/convert-to-partner` - Links Contact to Partner (if prospect becomes sales channel)

### Financial Routes

```
GET    /api/company/:companyId/financial/spends          // Get actual spending
POST   /api/company/:companyId/financial/spends          // Add spend transaction
PUT    /api/company/financial/spends/:spendId            // Update spend
DELETE /api/company/financial/spends/:spendId            // Delete spend

GET    /api/company/:companyId/financial/projections     // Get projections
POST   /api/company/:companyId/financial/projections     // Create projection
PUT    /api/company/financial/projections/:projectionId   // Update projection
DELETE /api/company/financial/projections/:projectionId   // Delete projection
```

### Roadmap Routes

```
GET    /api/company/:companyId/roadmap                   // Get roadmap items
POST   /api/company/:companyId/roadmap                   // Create roadmap item
PUT    /api/company/roadmap/:itemId                      // Update roadmap item
DELETE /api/company/roadmap/:itemId                       // Delete roadmap item
```

### Task Routes

```
GET    /api/company/:companyId/tasks                     // Get company tasks
POST   /api/company/:companyId/tasks                    // Create company task
PUT    /api/company/tasks/:taskId                        // Update task
DELETE /api/company/tasks/:taskId                        // Delete task
```

### Employee Routes

```
GET    /api/company/:companyId/employees                // Get employees
POST   /api/company/:companyId/employees                  // Add employee
PUT    /api/company/employees/:employeeId                // Update employee
DELETE /api/company/employees/:employeeId                // Remove employee
```

### Invite Routes (Invitation-Based Auth)

```
POST   /api/company/:companyId/invites                  // Create invitation
GET    /api/company/:companyId/invites                   // List invitations
PUT    /api/company/invites/:inviteId                    // Update invite (revoke, extend)
DELETE /api/company/invites/:inviteId                    // Delete invitation

POST   /api/company/invite/verify                        // Verify invitation token
POST   /api/company/invite/accept                        // Accept invitation (create employee + auth)
```

---

## Frontend Pages (Follow from Models = Pages)

### Auth Pages
- `Splash.jsx` (/splash) - Welcome/invitation check page
  - Checks for invite token in URL or localStorage
  - Shows "invitation required" if no token
  - Shows login form if valid token found

### Main Hub
- `CompanyAdminNav.jsx` (/) - Main hub with navigation cards

### Financial Pages (From Schema)
- `FinancialSpends.jsx` (HydratedPage) - List of actual spending transactions
- `FinancialSpendCreate.jsx` (CreatePage) - Add new spend transaction
- `FinancialSpendDetail.jsx` (ViewDetail) - View/edit individual spend
- `FinancialProjections.jsx` (HydratedPage) - List of projections
- `FinancialProjectionCreate.jsx` (CreatePage) - Create new projection
- `FinancialProjectionDetail.jsx` (ViewDetail) - View/edit projection

### Roadmap Pages
- `ProductRoadmap.jsx` (HydratedPage) - Company roadmap items

### Task Pages
- `CompanyTasks.jsx` (HydratedPage) - Company tasks list
- `CompanyTaskCreate.jsx` (CreatePage) - Create task
- `CompanyTaskDetail.jsx` (ViewDetail) - Task detail

### CRM Pages (Product CRM - Prospects → Users/Partners)
- `CompanyCrmHub.jsx` - CRM hub
- `CompanyCrmList.jsx` (HydratedPage) - Contact list
- `CompanyCrmCreate.jsx` (CreatePage) - Create contact
- `CompanyCrmDetail.jsx` (ViewDetail) - Contact detail
- `CompanyCrmConvert.jsx` (ConvertPage) - Convert prospect → User/Partner

### Other Pages
- `UserMetrics.jsx` - Read-only user counts (from dashboard routes)
- `PitchDeck.jsx` - Investor pitch deck
- `Marketing.jsx` - Outreach/Google Ads (MVP1)

---

## Authentication & Authorization

### Firebase Authentication Standard

**Following**: `FIREBASE-AUTH-AND-USER-MANAGEMENT.md` patterns

**Key Principle**: Firebase establishes universal identity (UID) that connects Owner across all systems. One Firebase UID = One Owner = One Database Entity Record.

### Frontend Firebase Config

**Location**: `gofastcompanyoutlook/src/config/firebaseConfig.js`

**Firebase Project**: `gofast-a5f94` (GoFast Firebase project)

**Exports**:
- `auth` - Firebase Auth instance
- `signInWithGoogle()` - Google OAuth sign-in
- `signOutUser()` - Sign out current user
- `getCurrentUser()` - Get current authenticated user
- `signUpWithEmail()` - Email/password sign-up
- `signInWithEmail()` - Email/password sign-in
- `getIdToken()` - Get Firebase ID token for authenticated requests

**Usage**:
```javascript
import { signInWithGoogle, getIdToken } from '../config/firebaseConfig.js';

// Sign in
const firebaseUser = await signInWithGoogle();
// firebaseUser = { uid, email, name, photoURL }

// Get token for API calls
const idToken = await getIdToken();
```

### Backend Firebase Middleware

**Location**: `middleware/firebaseMiddleware.js`

**Environment Variable**: `GOFAST_COMPANY_FIREBASE_SERVICE_ACCOUNT_KEY`
- **Note**: Different from GoFast app Firebase service key
- **Naming**: `GOFAST_COMPANY_` prefix to distinguish from athlete app Firebase
- **Purpose**: Company Outlook uses separate Firebase project/service account

**Implementation**:
```javascript
import admin from 'firebase-admin';

let firebaseAdmin = null;

const initializeFirebase = () => {
  if (!firebaseAdmin) {
    try {
      // GoFast Company Firebase service account (different from athlete app)
      const serviceAccount = process.env.GOFAST_COMPANY_FIREBASE_SERVICE_ACCOUNT_KEY;
      
      if (!serviceAccount) {
        console.error('❌ FIREBASE: GOFAST_COMPANY_FIREBASE_SERVICE_ACCOUNT_KEY not set in Render');
        throw new Error('Firebase service account not configured');
      }

      const serviceAccountKey = JSON.parse(serviceAccount);
      
      firebaseAdmin = admin.initializeApp({
        credential: admin.credential.cert(serviceAccountKey),
        projectId: serviceAccountKey.project_id
      }, 'gofast-company'); // Named app instance to avoid conflicts
      
      console.log('✅ FIREBASE: GoFast Company Admin SDK initialized');
    } catch (error) {
      console.error('❌ FIREBASE: Failed to initialize:', error.message);
      throw error;
    }
  }
  return firebaseAdmin;
};

export const verifyFirebaseToken = async (req, res, next) => {
  try {
    const admin = initializeFirebase();
    
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'No authorization token provided'
      });
    }
    
    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await admin.auth().verifyIdToken(token);
    
    // Add user info to request object
    req.user = {
      uid: decodedToken.uid,
      firebaseId: decodedToken.uid,
      email: decodedToken.email,
      name: decodedToken.name,
      picture: decodedToken.picture,
      emailVerified: decodedToken.email_verified
    };
    
    next();
  } catch (error) {
    console.error('❌ FIREBASE: Token verification failed:', error.message);
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired token'
    });
  }
};
```

### Route Patterns (Following FIREBASE-AUTH-AND-USER-MANAGEMENT.md)

#### Pattern A: OwnerCreateRoute (Universal Personhood)

**File**: `routes/Owner/ownerCreateRoute.js`  
**Endpoint**: `POST /api/owner/create`  
**Auth**: NO middleware required (happens before protected routes)

**Purpose**: Find or create Owner by Firebase ID. This happens AFTER Firebase authentication - it's entity creation/management, NOT authentication.

**Implementation**:
```javascript
router.post('/create', async (req, res) => {
  try {
    const { firebaseId, email, firstName, lastName, photoURL } = req.body;
    
    if (!firebaseId || !email) {
      return res.status(400).json({ 
        success: false,
        error: 'firebaseId and email are required' 
      });
    }
    
    // Find existing owner by firebaseId
    let owner = await prisma.owner.findUnique({
      where: { firebaseId }
    });
    
    if (owner) {
      return res.json({ success: true, owner });
    }
    
    // Create new owner
    owner = await prisma.owner.create({
      data: {
        firebaseId,
        email,
        name: firstName && lastName ? `${firstName} ${lastName}` : firstName || email?.split('@')[0],
        photoURL: photoURL || null
      }
    });
    
    return res.status(201).json({ success: true, owner });
  } catch (error) {
    console.error('❌ OwnerCreate error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});
```

#### Pattern B: OwnerHydrateRoute (Hydration)

**File**: `routes/Owner/ownerHydrateRoute.js`  
**Endpoint**: `GET /api/owner/hydrate`  
**Auth**: `verifyFirebaseToken` middleware required

**Purpose**: Find Owner's full account/profile by Firebase ID from verified token. This is the "hydration" route that loads complete Owner data.

**Implementation**:
```javascript
router.get('/hydrate', verifyFirebaseToken, async (req, res) => {
  try {
    const firebaseId = req.user?.uid; // From verified token
    
    if (!firebaseId) {
      return res.status(401).json({
        success: false,
        error: 'Firebase authentication required'
      });
    }
    
    const owner = await prisma.owner.findUnique({
      where: { firebaseId },
      include: {
        ownedCompanies: {
          include: {
            employees: true,
            crmContacts: true,
            financialSpends: true,
            roadmapItems: true,
            tasks: true
          }
        },
        managedCompanies: true
      }
    });
    
    if (!owner) {
      return res.status(404).json({
        success: false,
        error: 'Owner not found'
      });
    }
    
    res.json({
      success: true,
      owner,
      companies: owner.ownedCompanies,
      managedCompanies: owner.managedCompanies
    });
  } catch (error) {
    console.error('❌ OwnerHydrate error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});
```

#### Pattern C: Protected Entity Creation (Child Entities)

**File**: `routes/Company/companyCreateRoute.js`  
**Endpoint**: `POST /api/company/create`  
**Auth**: `verifyFirebaseToken` middleware required

**Purpose**: Create child entities (CompanyHQ, Contact, etc.) that belong to an authenticated Owner.

**Key Difference**: Pattern A creates universal personhood (Owner) - NO middleware. Pattern C creates child entities - REQUIRES middleware.

### Complete Authentication Flow

1. **User Signs In (Frontend)**
   ```javascript
   import { signInWithGoogle } from '../config/firebaseConfig.js';
   const firebaseUser = await signInWithGoogle();
   ```

2. **Create/Find Owner in Database (Pattern A)**
   ```javascript
   const response = await fetch('/api/owner/create', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({
       firebaseId: firebaseUser.uid,
       email: firebaseUser.email,
       firstName: firebaseUser.displayName?.split(' ')[0],
       lastName: firebaseUser.displayName?.split(' ')[1],
       photoURL: firebaseUser.photoURL
     })
   });
   const { owner } = await response.json();
   ```

3. **Hydrate Owner Data (Pattern B)**
   ```javascript
   const idToken = await getIdToken();
   const response = await fetch('/api/owner/hydrate', {
     method: 'GET',
     headers: { 'Authorization': `Bearer ${idToken}` }
   });
   const { owner } = await response.json();
   ```

4. **Create Child Entities (Pattern C)**
   ```javascript
   const idToken = await getIdToken();
   const response = await fetch('/api/company/create', {
     method: 'POST',
     headers: {
       'Content-Type': 'application/json',
       'Authorization': `Bearer ${idToken}`
     },
     body: JSON.stringify({
       companyName: 'My Company',
       ownerId: owner.id,
       // ... other fields
     })
   });
   ```

### Environment Variables

**Backend (Render)**:
```env
# GoFast Company Firebase Service Account (different from athlete app)
GOFAST_COMPANY_FIREBASE_SERVICE_ACCOUNT_KEY="{\"type\":\"service_account\",\"project_id\":\"gofast-a5f94\",...}"

# Database
DATABASE_URL="postgresql://..."

# Port
PORT=4000
```

**Frontend**:
- Firebase config is hardcoded in `src/config/firebaseConfig.js`
- Uses GoFast Firebase project: `gofast-a5f94`

### Key Points

- ✅ **Separate from Athlete auth** - Owner uses Firebase, Athlete uses separate auth system
- ✅ **Different Firebase project** - Company Outlook uses `gofast-a5f94` (same project, different service account key)
- ✅ **Service key naming** - `GOFAST_COMPANY_FIREBASE_SERVICE_ACCOUNT_KEY` to distinguish from athlete app
- ✅ **Pattern A**: No middleware (universal personhood creation)
- ✅ **Pattern B**: Requires middleware (hydration)
- ✅ **Pattern C**: Requires middleware (child entity creation)

---

## Key Architectural Decisions

1. **Separate Auth from Athlete Identity**
   - `Owner` model handles Company Outlook auth (Firebase)
   - `Athlete` model handles GoFast app auth (separate system)
   - **NO athleteId dependencies** in Company Outlook routes
   - **Clear separation of concerns** - Company operations don't require athlete signup

2. **Company-First Architecture**
   - `Company` (CompanyHQ) is root container for multi-tenancy
   - Everything stored under CompanyHQId
   - Owner is NOT a Contact - separate model, separate concern
   - Data isolation: Each CompanyHQ can only access their own data

3. **Prospect → User Conversion Path**
   - `CompanyCrmContact` represents universal personhood
   - Contact can convert to Athlete (if they sign up for GoFast)
   - Contact can convert to Partner (if they become sales channel)
   - Conversion tracked via `athleteId` and `partnerId` links
   - Contact remains in CRM regardless of conversion

4. **Separate Spend vs Projection Models - Items vs Totals**
   - `CompanyFinancialSpend` = **Individual items** (transactions we ingest)
   - `CompanyFinancialProjection` = **Total values** (aggregated budgets we ingest)
   - Different data ingestion patterns → Different models
   - **Architecture Question**: What are we ingesting? Items or totals?

5. **Email-Based Employees**
   - `CompanyEmployee` has NO `athleteId` (separate concern)
   - If employee wants app, they sign up separately as Athlete

6. **Unified Task Model**
   - One `Task` model with `ownerId` OR `companyId` (polymorphic)
   - Avoids duplicate task models

7. **Modular Hydration**
   - Entity-specific routes (e.g., `/api/crm/contacts?companyId=X`)
   - Not generic hydration routes

8. **Schema-First**
   - Schema defines models FIRST
   - Backend routes follow from schema
   - Frontend pages follow from models (Models = Pages)

9. **Invitation-Based Access**
   - `CompanyInvite` model for access control
   - Users must be invited (no open signup)
   - Token-based invitation URLs
   - Role/department set at invitation time

---

## Data Flow Examples

### Example 1: Owner Hydration (Firebase Auth)

```javascript
// GET /api/owner/hydrate (with Firebase token)
const owner = await prisma.owner.findUnique({
  where: { firebaseId },
  include: {
    ownedCompanies: {
      include: {
        employees: true,
        crmContacts: true,
        financialSpends: true,
        roadmapItems: true,
        tasks: true
      }
    },
    managedCompanies: true
  }
});

return {
  owner,
  companies: owner.ownedCompanies,
  managedCompanies: owner.managedCompanies
};
```

### Example 2: Prospect → User Conversion

```javascript
// POST /api/crm/contacts/:contactId/convert-to-athlete
// Body: { athleteId: "athlete123" } (from GoFast app signup)

const contact = await prisma.companyCrmContact.update({
  where: { id: contactId },
  data: {
    athleteId: "athlete123",  // Link to Athlete (separate system)
    pipeline: "users",         // Update pipeline
    status: "active"           // Update status
  }
});

// Contact remains in CRM, now linked to Athlete
// If Athlete signs up for GoFast, link is created
```

### Example 3: Creating a Prospect Contact

```javascript
// POST /api/crm/contacts
// Body: { companyId: "company-hq-id", name: "John Doe", email: "john@example.com", pipeline: "prospects" }

const contact = await prisma.companyCrmContact.create({
  data: {
    companyId: "company-hq-id",
    name: "John Doe",
    email: "john@example.com",
    pipeline: "prospects",
    status: "new"
  }
});

// Later, if John signs up for GoFast app:
// POST /api/crm/contacts/:contactId/convert-to-athlete
// Body: { athleteId: "athlete-from-gofast" }
```

---

## Multi-Tenancy

**CompanyHQId-First Storage & Hydration:**

### Multi-Tenancy Overview
- **The entire Company Outlook platform hosts multiple CompanyHQs** (actual customers using the platform)
- **Each CompanyHQ is a tenant** - they own and manage their own data
- **Data isolation**: Each CompanyHQ can only hydrate/access data scoped to their CompanyHQId
- **No cross-tenant access**: CompanyHQ A cannot see or access CompanyHQ B's data

### Storage (Multi-Tenancy)
- **Everything stored under CompanyHQId** (the root container)
- All contacts, employees, financial data scoped to `companyId` (CompanyHQId)
- `companyId` = CompanyHQId = The customer company's tenant identifier
- Each tenant's data is isolated by their CompanyHQId

### Hydration (CompanyHQId Direct)
- **Hydrate by CompanyHQId** - direct relationship, clean and simple
- **Owner is NOT a Contact** - ownerId is on Company model, so Contact queries won't include owner data
- **No filtering needed** - Contact.companyId = CompanyHQId, ownerId is separate
- **Can hydrate by string values** - `pipeline` and `status` string values work perfectly for filtering
- **Always filter by CompanyHQId** in all queries for security/isolation - ensures tenants only see their own data
- **Tenant isolation enforced**: Every query must include `companyId: companyHQId` to prevent cross-tenant data access

### Access Control Hierarchy

1. **ownerId** (Super Admin)
   - Literal owner of the company
   - Full access to everything
   - Can change company settings
   - Original creator/owner
   - **Separate from Contact model** - not a contact, never will be

2. **managerId** (Delegated Manager)
   - Assigned by ownerId (handled in routes/logic)
   - Can manage CRM stack
   - Cannot change company settings

---

## Key Takeaways

1. ✅ **CompanyHQId = Root Container** - Everything stored under CompanyHQId (multi-tenancy). Each CompanyHQ is a tenant - actual customers using the platform. Data isolation enforced - tenants can only access their own CompanyHQId data.

2. ✅ **Owner = Company Auth** - Owner model handles Firebase authentication, completely separate from Athlete identity. NO athleteId dependencies in Company Outlook routes.

3. ✅ **Contact → CompanyHQId Direct** - Contact has `companyId` = CompanyHQId directly, no intermediate layer needed

4. ✅ **Prospect → User Conversion** - Contact can convert to Athlete (if they sign up for GoFast) via `athleteId` link. Contact remains in CRM regardless of conversion.

5. ✅ **Prospect → Partner Conversion** - Contact can convert to Partner (if they become sales channel) via `partnerId` link (future model).

6. ✅ **ownerId = Super Admin** - Literal owner, mapped to CompanyHQ, full access, **NOT a Contact**

7. ✅ **managerId = Delegated** - Assigned by owner in routes/logic, can manage CRM, cannot change company settings

8. ✅ **Contacts are universal personhood** - Simple hydration, represents person across entire journey (prospect → user/partner/client)

9. ✅ **Pipeline tracking** - `pipeline` and `status` (string values) track funnel position and handle conversion

10. ✅ **Conversion via links** - Contact can have `athleteId` and `partnerId` links to track conversions to other systems

11. ✅ **String Values Work** - Can hydrate/filter contacts by `pipeline` and `status` string values perfectly

12. ✅ **Separate Auth Systems** - Owner uses Firebase (Company Outlook), Athlete uses separate auth (GoFast app)

---

**Last Updated**: January 2025  
**Architecture Pattern**: Company-First with Separate Auth  
**Multi-Tenancy**: Company-scoped (`companyId` = CompanyHQId)  
**Hydration Pattern**: CompanyHQId direct (owner is separate model, no filtering needed)  
**Contact Model**: Universal personhood for prospects → users/partners conversion  
**Auth Model**: Owner (Firebase) - separate from Athlete identity  
**Conversion**: Handled via `athleteId` and `partnerId` links, no separate models
