# GoFast Company Stack Architecture

**Last Updated**: January 2025  
**Purpose**: Comprehensive architecture documentation for GoFast Company Stack - single-tenant company management platform for GoFast operations

---

## Platform Vision

**GoFast Company Stack** is GoFast's internal company management platform for:
- **Managing** GoFast company operations, onboarding, revenue, finances, and HR
- **CRM** - Contact management with pipeline/stage tracking (contacts may become athletes)
- **Product Pipeline** - Track product development pipeline
- **Financial Management** - Track spending, projections, and financial health
- **Roadmap Planning** - Product, GTM, and operations roadmaps

**Core Value**: **Single-tenant company operations** - This is GoFast's internal tool (NOT multi-tenant like Ignite). Everything centers around a single `GoFastCompany` record with a hardcoded ID (`cmhpqe7kl0000nw1uvcfhf2hs`). Built on GoFast backend for easier athlete conversion and future security separation.

**Key Difference from Ignite**: 
- **Ignite** = Multi-tenant (multiple CompanyHQs, each with their own data)
- **GoFast Company Stack** = Single-tenant (just GoFast company, similar BD architecture but for one company)

---

## Core Philosophy: Single-Company Architecture

GoFast Company Stack is built for **one company** (GoFast). The `GoFastCompany` model represents GoFast company itself with a **hardcoded ID** (`cmhpqe7kl0000nw1uvcfhf2hs`) stored in `config/goFastCompanyConfig.js`. All other models and features link back to this single company.

**Single-Tenant Design**: Unlike Ignite (multi-tenant), this is GoFast's internal tool. No need for multi-tenant containers or tenant isolation - it's all one company. The company ID is hardcoded in config, and any authenticated `CompanyStaff` can upsert the company.

**Key Principle**: **Separate auth from athlete identity** - The `CompanyStaff` model handles authentication (Firebase), completely separate from `Athlete` model. This enables:
- Company operations without requiring athlete signup
- Contact → Athlete conversion path (contacts can become athletes later)
- Role-based access control (founder, community manager - config-based)

### GoFastCompany as Central Container

```
GoFastCompany (Single Record - Hardcoded ID: cmhpqe7kl0000nw1uvcfhf2hs)
  ├── Staff (Firebase Auth - Direct companyId + role, universal personhood)
  ├── Contacts (CRM - Universal personhood, config-driven pipeline: audienceType + pipelineStage)
  ├── Financial Data (Spends, Projections)
  ├── Roadmap Items (Product, GTM, Ops) - CompanyRoadmapItem with full fields
  ├── Tasks (Company-wide)
  └── [Future: Products, Deals, Integrations]
```

**Note**: `CompanyStaff` is universal personhood for the company - separate from `Athlete` identity. Direct `companyId` and `role` fields (no junction table needed - single-tenant). Company ID is hardcoded in `config/goFastCompanyConfig.js`.

---

## Database Schema Architecture

### GoFastCompany Model (Single Record - Root Container)

```prisma
model GoFastCompany {
  id          String @id @default(cuid()) // Single tenant - hardcoded ID in config (cmhpqe7kl0000nw1uvcfhf2hs)

  // Company Details (Upserted by any authenticated staff)
  companyName String // "GoFast Inc"
  address     String? // "2604 N. George Mason Dr."
  city        String? // "Arlington"
  state       String? // "VA"
  website     String? // "gofastcrushgoals.com"
  description String? // Company description

  // System
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relations - All scoped to this single company
  staff                CompanyStaff[] // Direct relation to staff (single-tenant, no junction needed)
  contacts             Contact[] // CRM contacts (config-driven pipeline stages)
  productPipelineItems ProductPipelineItem[] // Product Pipeline (product module, user-driven)
  financialSpends      CompanyFinancialSpend[]
  financialProjections CompanyFinancialProjection[]
  roadmapItems         CompanyRoadmapItem[]
  tasks                Task[]

  @@map("gofast_company")
}
```

**Key Architecture Point**: Single company record
- **One GoFastCompany record** - Not multiple companies
- **Hardcoded ID** = `cmhpqe7kl0000nw1uvcfhf2hs` stored in `config/goFastCompanyConfig.js`
- **No containerId** - Removed, using hardcoded ID instead
- **All data scoped to hardcoded ID** - No multi-tenancy, just one company
- **Any authenticated staff can upsert** - No founder-only restriction

### CompanyStaff Model (Company Auth - Firebase - Universal Personhood)

```prisma
model CompanyStaff {
  id         String  @id @default(cuid())
  firebaseId String  @unique // Firebase auth ID (for authentication)
  
  // Name fields (separate, not combined)
  firstName  String? // First name
  lastName   String? // Last name
  email      String  // Email address (required)
  photoURL   String? // Profile photo URL (from Firebase - stored for quick access)

  // Company and Role (direct fields - single-tenant, no junction needed)
  companyId  String? // Links to GoFastCompany.id (nullable to allow staff creation before company)
  role       String // "Founder", "CFO", "Sales", "Marketing", "Community Manager" (from roleConfig.js - enum-like)
  
  // Employment details (founder/CEO can fill in)
  startDate  DateTime? // Start date (when staff joined/started)
  salary     Float?    // Salary (optional, founder/CEO can set)

  // Verification Code (for onboarding/re-authentication)
  verificationCode String? // Unique code for employee onboarding (future: can be changed)

  // Relations
  company GoFastCompany? @relation(fields: [companyId], references: [id], onDelete: Cascade)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

**Firebase Integration**:
- `firebaseId` = Firebase UID (universal identifier)
- `firstName`, `lastName` = Separate name fields (from Firebase or manually set)
- `email` = From Firebase auth (required field)
- `photoURL` = From Firebase `photoURL` - **Stored in CompanyStaff model for quick access**

**Key Architecture Point**: CompanyStaff is universal personhood for the company
- **NO athleteId** - CompanyStaff is NOT an athlete extension
- **Separate auth system** - Uses Firebase, not athlete auth
- **Direct companyId and role** - No junction table needed (single-tenant, one company)
- **Universal personhood** - Similar to `Contact` but for staff members
- **Role-based access** - Direct `role` field validated against `config/roleConfig.js` (enum-like)
- **Employment details** - `startDate` and `salary` can be set by founder/CEO
- **Verification code** - For employee onboarding (unique link with code)
- **Future**: If Firebase tokens lost, re-enter code (future: can change code)
- If staff wants to use GoFast app, they sign up separately as Athlete

### Role Configuration (`config/roleConfig.js`)

**Config-Driven Role System** - Similar to pipeline config, enum-like values.

```javascript
export const ROLES = {
  FOUNDER: 'Founder',
  CFO: 'CFO',
  SALES: 'Sales',
  MARKETING: 'Marketing',
  COMMUNITY_MANAGER: 'Community Manager'
};
```

**Key Architecture Point**: Config-driven roles
- **Direct import helper** - Config file imported directly by backend services and frontend (no API route)
- **Frontend dropdowns** - Frontend imports config to build dropdowns for role selection
- **Backend validation** - Validates role against config before saving
- **Enum-like behavior** - Config acts like enums - type-safe, validated values
- **Founder/CEO can set** - Founder/CEO can assign roles and fill in startDate/salary

### Contact Model (CRM - Universal Personhood)

```prisma
model Contact {
  id        String @id @default(cuid())
  companyId String // Links to GoFastCompany.id (containerId)

  // Core person data (aligned with Ignite pattern)
  firstName String?
  lastName  String?
  goesBy    String? // Preferred name
  email     String?
  phone     String?
  title     String?
  
  // Pipeline Tracking (config-driven, not relational)
  pipelineId    String? // Unique identifier for this contact's pipeline journey (for tracking/grouping)
  audienceType  String? // e.g. "EliteRunner", "RunClub", "RunnerInfluencer", etc. (from pipelineConfig.js - enum-like)
  pipelineStage String? // e.g. "Interest", "Meeting", "Agreement", "OnPlatform" (validated against config - enum-like)

  // Conversion Path (Contact → Athlete)
  athleteId String? // Links to Athlete.id if contact converted to athlete
  
  // Notes
  notes String?
  
  // System
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  company GoFastCompany @relation(fields: [companyId], references: [id], onDelete: Cascade)

  @@map("contacts")
}
```

**Key Architecture Point**: Universal personhood with config-driven pipeline
- **Aligned with Ignite** - Uses `contacts` model (broad, aligns with Ignite pattern)
- **Config-driven pipeline** - Direct fields (`audienceType`, `pipelineStage`) validated against `config/pipelineConfig.js`
- **No relational models** - No Pipeline or PipelineConfig models - all config-driven
- **Enum-like values** - `audienceType` and `pipelineStage` are validated against config (like enums)
- **Pipeline ID tracking** - `pipelineId` field for tracking/grouping (unique identifier)
- **May become athletes** - `athleteId` link for conversion (relational connection)
- **No separate prospect/partner models** - All contacts, differentiated by `audienceType`/`pipelineStage`

### Pipeline Configuration (`config/pipelineConfig.js`)

**Config-Driven Pipeline System** - No database models, just a config file.

```javascript
export const pipelineConfig = {
  EliteRunner: {
    label: "Elite Runner",
    description: "Top-tier athletes invited to represent the GoFast platform.",
    stages: ["Interest", "Meeting", "Agreement", "OnPlatform"],
  },
  RunnerInfluencer: {
    label: "Runner Influencer",
    description: "Content-driven athletes who can amplify GoFast through reach and authenticity.",
    stages: ["Interest", "Meeting", "Agreement", "OnPlatform"],
  },
  RunMerch: {
    label: "Run Merch Partner",
    description: "Brands offering running gear, apparel, or accessories through GoFast.",
    stages: ["Interest", "Meeting", "Agreement", "OnPlatform"],
  },
  RunFeed: {
    label: "Run Feed Partner",
    description: "Content, podcasts, or media channels featuring GoFast athletes or clubs.",
    stages: ["Interest", "Meeting", "Agreement", "OnPlatform"],
  },
  RunClub: {
    label: "Run Club Organizer",
    description: "Local or regional clubs organizing weekly runs and crew challenges.",
    stages: ["Interest", "Demo", "Agreement", "OnPlatform"], // "Demo" instead of "Meeting"
  },
  RunEventOrganizer: {
    label: "Run Event Organizer",
    description: "Race directors or event organizers integrating GoFast for results, tracking, or sponsorship.",
    stages: ["Interest", "Pitch", "Agreement", "OnPlatform"], // "Pitch" instead of "Meeting"
  },
};
```

**Key Architecture Point**: Config-driven, not relational
- **Direct import helper** - Config file imported directly by backend services and frontend (no API route)
- **Frontend dropdowns** - Frontend imports config to build dropdowns for `audienceType` and `pipelineStage`
- **Backend validation** - `contactService.js` validates `audienceType`/`pipelineStage` against config
- **Enum-like behavior** - Config acts like enums - type-safe, validated values
- **No database models** - All pipeline logic in config file, not database tables
- **Future scalability** - Easy to add new audience types or stages by updating config

### CompanyFinancialSpend (Actual Spending - INDIVIDUAL ITEMS)

```prisma
model CompanyFinancialSpend {
  id          String @id @default(cuid())
  companyId   String  // Links to GoFastCompany.id (containerId)
  
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
  
  company     GoFastCompany @relation(fields: [companyId], references: [id], onDelete: Cascade)
  
  @@map("company_financial_spends")
}
```

**Key Architecture Point**: Individual transaction items
- **Individual items** - Each transaction is a record
- **Total Value** = Calculated by aggregating items (SUM by category, period, department, etc.)

### CompanyFinancialProjection (Projected Spending - TOTAL VALUES)

```prisma
model CompanyFinancialProjection {
  id          String @id @default(cuid())
  companyId   String  // Links to GoFastCompany.id (containerId)
  
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
  
  company     GoFastCompany @relation(fields: [companyId], references: [id], onDelete: Cascade)
  
  @@map("company_financial_projections")
}
```

**Key Architecture Point**: Total values (aggregated/projected amounts)
- **NOT individual items** - These are summary/aggregated values
- **Ingested as totals** - User enters total projected expenses, total revenue, etc.

### ProductPipelineItem (Product Module - User-Driven)

```prisma
model ProductPipelineItem {
  id          String @id @default(cuid())
  companyId   String  // Links to GoFastCompany.id (containerId)
  
  // User-Driven Product Module Fields
  name        String  // Product feature/module name (user input)
  description String? // Description (user input)
  timeItTakes String? // Time it takes (e.g., "2 weeks", "1 month") (user input)
  
  // Status
  status      String @default("pending") // pending, in_progress, completed, cancelled
  priority    String @default("medium") // low, medium, high, urgent
  
  // Dates
  startedAt   DateTime?
  completedAt DateTime?
  
  // System
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  company     GoFastCompany @relation(fields: [companyId], references: [id], onDelete: Cascade)
  
  @@map("product_pipeline_items")
}
```

**Key Architecture Point**: Product module, user-driven (NOT contact-driven)
- **User-driven inputs** - Name, description, time it takes (all user input)
- **NOT linked to contacts** - This is product development tracking, not CRM
- **Different from BD Pipeline** - BD Pipeline = contact-driven, config-based. Product Pipeline = product module, user-driven
- **Product development focus** - Track product features/modules being built

### CompanyRoadmapItem (Product Roadmap - Full Implementation)

```prisma
model CompanyRoadmapItem {
  id        String @id @default(cuid())
  companyId String // Links to Company, not Founder (legacy field - kept for compatibility)
  
  // Item Classification
  itemType           String  @default("Feature") // "Feature" or "Milestone"
  parentArchitecture String? // Group related features (e.g., "RunCrew", "Profile")
  roadmapType        String // "Product", "GTM", "Operations", "Infrastructure", "UX/Design"
  category           String  @default("Frontend Demo") // "Frontend Demo", "API Integration", "Backend Scaffolding", "User Testing", "Release"
  
  // Core Details
  title      String
  whatItDoes String? // User value proposition
  howItHelps String? // How it helps overall build
  
  // Data & Integration
  fieldsData    String? // What fields/data needed
  howToGet      String? // APIs, routes, data sources
  prerequisites String? // Setup, research, account creation, auth
  
  // Visual & Planning
  visual      String @default("List") // "List", "Timeline", "Kanban"
  orderNumber Int? // Order in sequence (1, 2, 3...)
  
  // Time Tracking
  hoursEstimated Int? // Initial estimate
  hoursSpent     Int? // Actual time spent
  
  // Dates & Status
  targetDate  DateTime?
  dueDate     DateTime?
  status      String    @default("Not Started") // Not Started, In Progress, Done
  priority    String    @default("P1") // P0, P1, P2
  completedAt DateTime?
  
  // System
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  company         Company        @relation(fields: [companyId], references: [id], onDelete: Cascade)
  GoFastCompany   GoFastCompany? @relation(fields: [goFastCompanyId], references: [id])
  goFastCompanyId String? // Links to GoFastCompany.id (single tenant - hardcoded in config)
  
  @@map("company_roadmap_items")
}
```

**Key Architecture Point**: Product roadmap with full field support
- **Full field set** - Supports all roadmap fields (whatItDoes, howItHelps, fieldsData, howToGet, prerequisites, etc.)
- **Time tracking** - hoursEstimated, hoursSpent for critical path tracking
- **Priority system** - P0 (critical), P1 (important), P2 (nice to have)
- **Uses hardcoded company ID** - Routes use `getGoFastCompanyId()` from config
- **Config-driven** - Field options defined in `config/roadmapConfig.js` and `config/roadmapMapper.js`

### Task (Unified - CompanyStaff OR Company)

```prisma
model Task {
  id        String @id @default(cuid())
  
  // Polymorphic Link - ONE of these must be set
  staffId   String?  // For staff personal tasks
  companyId String?  // For company-wide tasks
  
  // Task Details
  title       String
  description String?
  status      String @default("pending") // pending, in_progress, completed, cancelled
  priority    String @default("medium") // low, medium, high, urgent
  dueDate     DateTime?
  
  // Department (for company tasks)
  department  String? // "Engineering", "Design", "Marketing"
  
  // Staff Priority Flag (for company tasks)
  isTopPriority Boolean @default(false) // Staff can mark "most important now"
  
  // Completion
  completedAt DateTime?
  
  // System
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  // Relations
  staff   CompanyStaff? @relation(fields: [staffId], references: [id], onDelete: Cascade)
  company GoFastCompany? @relation(fields: [companyId], references: [id], onDelete: Cascade)
  
  @@map("tasks")
}
```

**Key Architecture Point**: Unified task model
- **Staff tasks** - Personal tasks for staff (staffId set, companyId null)
- **Company tasks** - Company-wide tasks (companyId set, staffId null)

---

## Onboarding Flow

### Founder Onboarding Sequence

1. **GF Splash** (`/gfcompanysplash`)
   - Checks Firebase auth state
   - If authenticated → `/gfcompanywelcome`
   - If not authenticated → Code verification screen

2. **Code Verification Screen** (`/gfcompanycodeverify`)
   - Founder enters verification code
   - For employees: Unique link with code (future)
   - If Firebase tokens lost: Re-enter code (future: can change code)

3. **Company Details Upsert** (Founder only)
   - Create `GoFastCompany` record with:
     - `companyName`: "GoFast Inc"
     - `address`: "2604 N. George Mason Dr."
     - `city`: "Arlington"
     - `state`: "VA"
     - `website`: "gofastcrushgoals.com"
     - `description`: Company description
   - Generate unique `containerId`

4. **Profile Setup by Founder** (`/gfcompanyprofilesetup`)
   - Founder completes profile
   - Set name, photo, etc.

5. **Platform Access**
   - After company upsert + profile setup → Can use platform

### Employee Onboarding (Future)

- Employee receives unique link with verification code
- Enters code → Creates CompanyStaff record with companyId and role (direct fields)
- Profile setup → Platform access

---

## Route Architecture

### CompanyStaff Routes (Firebase Auth)

```
POST   /api/staff/create              → Find or create CompanyStaff by firebaseId
PUT    /api/staff/:id/profile         → Update CompanyStaff profile (name, email)
GET    /api/staff/hydrate             → Hydrate CompanyStaff with full data (requires token)
POST   /api/staff/verify-code         → Verify verification code (for onboarding)
```

### GoFastCompany Routes

**File**: `routes/Company/companyCreateRoute.js`, `companyHydrateRoute.js`  
**Auth**: `verifyFirebaseToken` middleware required  
**Company ID**: Uses hardcoded ID from `config/goFastCompanyConfig.js`

```
GET    /api/company/hydrate           → Hydrate GoFastCompany + all relations (single company)
POST   /api/company/create            → Upsert GoFastCompany (any authenticated staff can upsert)
```

**Key Points**:
- ✅ **Uses hardcoded company ID** - Routes automatically use `getGoFastCompanyId()` from config
- ✅ **Any staff can upsert** - No founder-only restriction (removed)
- ✅ **Auto-assigns Founder role** - If staff creating company doesn't have a role, auto-assigns 'Founder'
- ✅ **Single-tenant** - Only one company exists, identified by hardcoded ID

### Contact Routes (CRM - Aligned with Ignite Pattern)

```
GET    /api/contacts?companyId=xxx&audienceType=xxx&pipelineStage=xxx  // Filter by audienceType/pipelineStage
GET    /api/contacts/:contactId                       // Single contact detail
POST   /api/contacts                                  // Create contact
PUT    /api/contacts/:contactId                      // Update contact
DELETE /api/contacts/:contactId                       // Delete contact

POST   /api/contacts/:contactId/convert-to-athlete   // Convert contact → Athlete user
```

### Contact Pipeline Routes (Config-Driven)

```
GET    /api/contacts?companyId=xxx                              // List all contacts
GET    /api/contacts?companyId=xxx&audienceType=EliteRunner     // Filter by audienceType
GET    /api/contacts?companyId=xxx&pipelineStage=Interest       // Filter by pipelineStage
GET    /api/contacts/:contactId                                 // Get single contact
POST   /api/contacts                                            // Create contact
PUT    /api/contacts/:contactId                                 // Update contact (includes audienceType/pipelineStage)
PUT    /api/contacts/:contactId/pipeline                        // Update contact pipeline (audienceType + pipelineStage, validates against config)
DELETE /api/contacts/:contactId                                 // Delete contact
POST   /api/contacts/:contactId/convert-to-athlete              // Convert contact → Athlete user
```

**Key Routes**: Contact Pipeline (config-driven)
- `GET /api/contacts?companyId=xxx&audienceType=RunClub` - Get contacts by audience type
- `GET /api/contacts?companyId=xxx&pipelineStage=Meeting` - Get contacts by pipeline stage
- `PUT /api/contacts/:contactId/pipeline` - Update contact pipeline (validates against `config/pipelineConfig.js`)
- Pipeline config imported directly from `config/pipelineConfig.js` (no API route needed)

### Product Pipeline Routes (Product Module - User-Driven)

```
GET    /api/product-pipeline                        // Get all product pipeline items
GET    /api/product-pipeline/:itemId                 // Get single product pipeline item
POST   /api/product-pipeline                        // Create product pipeline item (name, description, timeItTakes)
PUT    /api/product-pipeline/:itemId                // Update product pipeline item
DELETE /api/product-pipeline/:itemId                // Delete product pipeline item
```

**Key Routes**: Product Pipeline module (founder wants pipeline module and display)
- `GET /api/product-pipeline` - Get all product pipeline items (user-driven)
- `POST /api/product-pipeline` - Create product item with name, description, timeItTakes
- **NOT contact-driven** - This is product development tracking, not CRM

### Financial Routes

```
GET    /api/company/financial/spends                 // Get actual spending
POST   /api/company/financial/spends                 // Add spend transaction
PUT    /api/company/financial/spends/:spendId         // Update spend
DELETE /api/company/financial/spends/:spendId         // Delete spend

GET    /api/company/financial/projections             // Get projections
POST   /api/company/financial/projections             // Create projection
PUT    /api/company/financial/projections/:projectionId  // Update projection
DELETE /api/company/financial/projections/:projectionId  // Delete projection
```

### Roadmap Routes (Product Roadmap)

**File**: `routes/Company/companyRoadmapRoute.js`  
**Auth**: `verifyFirebaseToken` middleware required  
**Company ID**: Uses hardcoded ID from `config/goFastCompanyConfig.js`

```
GET    /api/company/roadmap                          // Get all roadmap items (filtered by roadmapType, status, parentArchitecture)
GET    /api/company/roadmap/:itemId                  // Get single roadmap item
POST   /api/company/roadmap                          // Create roadmap item (title required, all other fields optional)
PUT    /api/company/roadmap/:itemId                  // Update roadmap item
DELETE /api/company/roadmap/:itemId                  // Delete roadmap item
```

**Query Parameters** (GET `/api/company/roadmap`):
- `?roadmapType=Product|GTM|Operations` - Filter by roadmap type
- `?status=Not Started|In Progress|Done` - Filter by status
- `?parentArchitecture=RunCrew|Profile|Messaging` - Filter by parent architecture
- `?itemType=Feature|Milestone` - Filter by item type

**Request Body** (POST `/api/company/roadmap`):
- `title` (required) - Feature or milestone name
- `roadmapType` (default: "Product") - Type of roadmap
- `priority` (default: "P1") - P0, P1, or P2
- `status` (default: "Not Started") - Not Started, In Progress, Done
- `hoursEstimated` - Initial estimate of work hours
- `whatItDoes` - User value proposition
- `howItHelps` - How it helps overall build
- All other fields optional (see `config/roadmapMapper.js` for full field list)

**Key Points**:
- ✅ **Uses hardcoded company ID** - Routes automatically use `getGoFastCompanyId()` from config
- ✅ **Auto-assigns orderNumber** - If not provided, assigns next sequential number
- ✅ **Config-driven** - Field options and validation via `config/roadmapConfig.js`

### Task Routes

```
GET    /api/company/tasks                            // Get company tasks
POST   /api/company/tasks                            // Create company task
PUT    /api/company/tasks/:taskId                    // Update task
DELETE /api/company/tasks/:taskId                    // Delete task
```

---

## Frontend Pages

### Auth Pages
- `gfcompanysplash.jsx` (`/gfcompanysplash`) - Welcome/auth check
- `gfcompanycodeverify.jsx` (`/gfcompanycodeverify`) - Code verification screen
- `gfcompanysignin.jsx` (`/gfcompanysignin`) - Sign in
- `gfcompanysignup.jsx` (`/gfcompanysignup`) - Sign up
- `gfcompanywelcome.jsx` (`/gfcompanywelcome`) - Welcome/hydration hub

### Onboarding Pages
- `gfcompanyprofilesetup.jsx` (`/gfcompanyprofilesetup`) - Profile setup by founder
- `gfcompanydetails.jsx` (`/gfcompanydetails`) - Company details upsert (founder)

### Main Hub
- `CompanyAdminNav.jsx` (`/`) - Main hub with navigation cards

### Product Pipeline Pages (Main Focus)
- `ProductPipeline.jsx` (`/product-pipeline`) - Product pipeline module display (founder wants this)
  - Shows product pipeline items (name, description, timeItTakes)
  - User-driven product development tracking
  - NOT contact-driven (different from Contact Pipeline)
- `ProductPipelineItem.jsx` (`/product-pipeline/:itemId`) - Product pipeline item detail

### CRM Pages
- `CompanyCrmHub.jsx` (`/crm`) - CRM hub
- `CompanyCrmList.jsx` (`/crm/list`) - Contact list
- `CompanyCrmCreate.jsx` (`/crm/create`) - Create contact
- `CompanyCrmDetail.jsx` (`/crm/:contactId`) - Contact detail

### Financial Pages
- `FinancialSpends.jsx` (`/financial-spends`) - List of actual spending transactions
- `FinancialSpendCreate.jsx` (`/financial-spends/create`) - Add new spend transaction
- `FinancialProjections.jsx` (`/financial-projections`) - List of projections
- `FinancialProjectionCreate.jsx` (`/financial-projections/create`) - Create new projection

### Roadmap Pages
- `ProductRoadmap.jsx` (`/roadmap`) - Company roadmap items

### Task Pages
- `CompanyTasks.jsx` (`/tasks`) - Company tasks list
- `CompanyTaskCreate.jsx` (`/tasks/create`) - Create task

---

## Authentication & Authorization

### Firebase Authentication Standard

**Following**: `FIREBASE-AUTH-AND-USER-MANAGEMENT.md` patterns

**Key Principle**: Firebase establishes universal identity (UID) that connects CompanyStaff across all systems. One Firebase UID = One CompanyStaff = One Database Entity Record.

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

### Backend Firebase Middleware

**Location**: `middleware/firebaseMiddleware.js`

**Environment Variable**: `FIREBASE_SERVICE_ACCOUNT`
- **Note**: Uses the same Firebase project (`gofast-a5f94`) as the GoFast athlete app
- **Purpose**: Since both apps use the same Firebase project, they share the same service account key
- **Render**: Uses existing `FIREBASE_SERVICE_ACCOUNT` environment variable (already configured)

### Route Patterns

#### Pattern A: StaffCreateRoute (Universal Personhood)

**File**: `routes/Company/staffCreateRoute.js`  
**Endpoint**: `POST /api/staff/create`  
**Auth**: NO middleware required (happens before protected routes)

**Purpose**: Find or create CompanyStaff by Firebase ID. This happens AFTER Firebase authentication - it's entity creation/management, NOT authentication.

**Note**: All company-related routes are in `routes/Company/` folder.

#### Pattern B: StaffHydrateRoute (Hydration)

**File**: `routes/Company/staffHydrateRoute.js`  
**Endpoint**: `GET /api/staff/hydrate`  
**Auth**: `verifyFirebaseToken` middleware required

**Purpose**: Find CompanyStaff's full account/profile by Firebase ID from verified token. This is the "hydration" route that loads complete CompanyStaff data with company and role.

**Note**: All company-related routes are in `routes/Company/` folder.

#### Pattern C: Protected Entity Creation (Child Entities)

**File**: `routes/Company/companyCreateRoute.js`  
**Endpoint**: `POST /api/company/create`  
**Auth**: `verifyFirebaseToken` middleware required

**Purpose**: Create GoFastCompany record (founder only - during onboarding). Creates company details and ensures staff.companyId is set (direct relation, no junction table).

**Note**: All company-related routes are in `routes/Company/` folder.

---

## Key Architectural Decisions

1. **Single-Tenant Architecture**
   - `GoFastCompany` is a single record (not multiple companies)
   - **Hardcoded ID** = `cmhpqe7kl0000nw1uvcfhf2hs` stored in `config/goFastCompanyConfig.js`
   - **No containerId** - Removed, using hardcoded ID instead
   - No multi-tenancy - just GoFast company
   - Any authenticated `CompanyStaff` can upsert the company
   - Built on GoFast backend for easier athlete conversion

2. **Separate Auth from Athlete Identity**
   - `CompanyStaff` model handles GoFast Company Stack auth (Firebase)
   - `Athlete` model handles GoFast app auth (separate system)
   - **NO athleteId dependencies** in Company Stack routes
   - **Clear separation of concerns** - Company operations don't require athlete signup

3. **Contact → Athlete Conversion Path**
   - `Contact` model represents universal personhood (aligned with Ignite)
   - Contact can convert to Athlete (if they sign up for GoFast)
   - Conversion tracked via `athleteId` link (relational connection)
   - Contact remains in CRM regardless of conversion

4. **Config-Driven Contact Pipeline System**
   - **Contact Pipeline** = Config-driven (direct `audienceType` and `pipelineStage` fields on Contact)
   - **No relational models** - No Pipeline or PipelineConfig models, all validated against `config/pipelineConfig.js`
   - **Enum-like values** - `audienceType` (EliteRunner, RunClub, etc.) and `pipelineStage` (Interest, Meeting, Agreement, etc.)
   - **Frontend dropdowns** - Config file imported directly by frontend for dropdowns
   - **Backend validation** - `contactService.js` validates against config before saving
   - **Product Pipeline** = Separate system - `ProductPipelineItem` model with name, description, timeItTakes (user input)
   - **Different purposes**: Contact Pipeline = CRM/BD tracking (config-driven). Product Pipeline = Product development tracking (user-driven)

5. **Role-Based Access (Direct Fields)**
   - Direct `role` field on `CompanyStaff` (no junction table - single-tenant)
   - **For now**: Hardcode role as "founder" only
   - **Future**: Config-based roles via roleConfig.js (founder, admin, manager, employee)

6. **Onboarding Flow**
   - GF Splash → Auth check → Code verification → Company upsert → Profile setup → Platform access
   - Founder creates company details during onboarding
   - Employees get unique link with code (future)

7. **Schema-First**
   - Schema defines models FIRST
   - Backend routes follow from schema
   - Frontend pages follow from models (Models = Pages)

---

## Current Focus: Product Pipeline Module

**Founder (Adam Cole) wants**: Product pipeline module and display

**Implementation**:
1. **Product Pipeline Items** - User creates product items with name, description, timeItTakes
2. **Product Pipeline Display** - Show all product pipeline items (user-driven, NOT contact-driven)
3. **Product Development Tracking** - Track product features/modules being built

**Routes**:
- `GET /api/product-pipeline` - Get all product pipeline items
- `POST /api/product-pipeline` - Create product item (name, description, timeItTakes)
- `PUT /api/product-pipeline/:itemId` - Update product item
- `DELETE /api/product-pipeline/:itemId` - Delete product item

**Frontend**:
- `ProductPipeline.jsx` - Product pipeline module display (main focus)
- Shows product items with name, description, timeItTakes
- User-driven product development tracking (NOT contact-driven)

---

## Key Takeaways

1. ✅ **Single-Tenant** - GoFastCompany is a single record (not multiple companies)
2. ✅ **Hardcoded Company ID** = `cmhpqe7kl0000nw1uvcfhf2hs` stored in `config/goFastCompanyConfig.js`
3. ✅ **No containerId** - Removed, using hardcoded ID instead
4. ✅ **CompanyStaff = Company Auth** - Separate from Athlete identity, nullable companyId allows staff creation before company
5. ✅ **Any Staff Can Upsert** - No founder-only restriction, any authenticated staff can create/update company
6. ✅ **Contacts = Universal Personhood** - Aligned with Ignite pattern, may become athletes
7. ✅ **Config-Driven Contact Pipeline** - Direct `audienceType` and `pipelineStage` fields on Contact, validated against `config/pipelineConfig.js` (no relational models)
8. ✅ **Product Roadmap** - Full implementation with all fields (whatItDoes, howItHelps, hoursEstimated, priority P0/P1/P2, etc.)
9. ✅ **Config-Driven Roadmap** - Field options defined in `config/roadmapConfig.js` and `config/roadmapMapper.js`
10. ✅ **Built on GoFast Backend** - Easier athlete conversion, future security separation

---

**Last Updated**: January 2025  
**Architecture Pattern**: Single-Tenant Company-First with Separate Auth & Config-Based Pipeline  
**Company ID**: Hardcoded `cmhpqe7kl0000nw1uvcfhf2hs` in `config/goFastCompanyConfig.js`  
**Auth Model**: CompanyStaff (Firebase) - separate from Athlete identity, nullable companyId  
**Access Control**: Role-based via direct `role` field on `CompanyStaff` (config-driven via `config/roleConfig.js`)  
**Company Upsert**: Any authenticated `CompanyStaff` can upsert the company (no founder-only restriction)  
**CRM Pattern**: Contacts with config-driven pipeline (`audienceType` + `pipelineStage` fields, validated against `config/pipelineConfig.js`)  
**Product Roadmap**: Full implementation with time tracking, priority (P0/P1/P2), and all roadmap fields  
**Roadmap Config**: Field options and validation via `config/roadmapConfig.js` and `config/roadmapMapper.js`  
**Current Focus**: Product Roadmap with critical path tracking (hoursEstimated, priority P0/P1/P2)
