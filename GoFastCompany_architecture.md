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

**Core Value**: **Single-tenant company operations** - This is GoFast's internal tool (NOT multi-tenant like Ignite). Everything centers around a single `GoFastCompany` record with a unique containerId. Built on GoFast backend for easier athlete conversion and future security separation.

**Key Difference from Ignite**: 
- **Ignite** = Multi-tenant (multiple CompanyHQs, each with their own data)
- **GoFast Company Stack** = Single-tenant (just GoFast company, similar BD architecture but for one company)

---

## Core Philosophy: Single-Company Architecture

GoFast Company Stack is built for **one company** (GoFast). The `GoFastCompany` model represents GoFast company itself with a single unique `containerId`. All other models and features link back to this single company.

**Single-Tenant Design**: Unlike Ignite (multi-tenant), this is GoFast's internal tool. No need for multi-tenant containers or tenant isolation - it's all one company.

**Key Principle**: **Separate auth from athlete identity** - The `CompanyStaff` model handles authentication (Firebase), completely separate from `Athlete` model. This enables:
- Company operations without requiring athlete signup
- Contact → Athlete conversion path (contacts can become athletes later)
- Role-based access control (founder, community manager - config-based)

### GoFastCompany as Central Container

```
GoFastCompany (Single Record - containerId)
  ├── Staff (Firebase Auth - Direct companyId + role, universal personhood)
  ├── Contacts (CRM - Universal personhood, may become athletes)
  ├── Pipeline/Stage (Config-based pipeline tracking)
  ├── Financial Data (Spends, Projections)
  ├── Roadmap Items (Product, GTM, Ops)
  ├── Tasks (Company-wide)
  └── [Future: Products, Deals, Integrations]
```

**Note**: `CompanyStaff` is universal personhood for the company - separate from `Athlete` identity. Direct `companyId` and `role` fields (no junction table needed - single-tenant).

---

## Database Schema Architecture

### GoFastCompany Model (Single Record - Root Container)

```prisma
model GoFastCompany {
  id          String   @id @default(cuid())  // This is containerId - the root container
  containerId String   @unique  // Unique container identifier for GoFast operations
  
  // Company Details (Upserted by founder during onboarding)
  companyName String   // "GoFast Inc"
  address     String?  // "2604 N. George Mason Dr."
  city        String?  // "Arlington"
  state       String?  // "VA"
  website     String?  // "gofastcrushgoals.com"
  description String?  // Company description
  
  // System
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  // Relations - All scoped to this single company
  staff       CompanyStaff[]  // Direct relation to staff (single-tenant, no junction needed)
  contacts    Contact[]            // CRM contacts
  pipelines   Pipeline[]           // BD Pipeline (contact-driven, config-based)
  productPipelineItems ProductPipelineItem[]  // Product Pipeline (product module, user-driven)
  financialSpends CompanyFinancialSpend[]
  financialProjections CompanyFinancialProjection[]
  roadmapItems CompanyRoadmapItem[]
  tasks       Task[]
  
  @@map("gofast_company")
}
```

**Key Architecture Point**: Single company record
- **One GoFastCompany record** - Not multiple companies
- **containerId** = Unique identifier for all GoFast operations (GoFastCRM, GoFastFinance, etc.)
- **All data scoped to containerId** - No multi-tenancy, just one company
- **Company details upserted by founder** during onboarding flow

### CompanyStaff Model (Company Auth - Firebase - Universal Personhood)

```prisma
model CompanyStaff {
  id          String   @id @default(cuid())
  firebaseId  String   @unique  // Firebase auth ID (for authentication)
  name        String?  // Full name (from Firebase displayName or firstName/lastName)
  email       String?  // Email address (from Firebase)
  photoURL    String?  // Profile photo URL (from Firebase - stored for quick access)
  
  // Company and Role (direct fields - single-tenant, no junction needed)
  companyId   String   // Links to GoFastCompany.id (single company)
  role        String   // "founder", "admin", "manager", "employee" (from roleConfig.js)
  department  String?  // Optional department assignment
  
  // Verification Code (for onboarding/re-authentication)
  verificationCode String?  // Unique code for employee onboarding (future: can be changed)
  
  // Relations
  company     GoFastCompany @relation(fields: [companyId], references: [id], onDelete: Cascade)
  
  joinedAt    DateTime @default(now()) // When staff joined company
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

**Firebase Integration**:
- `firebaseId` = Firebase UID (universal identifier)
- `name` = Parsed from Firebase `displayName` (format: "First Last") or set manually
- `email` = From Firebase auth
- `photoURL` = From Firebase `photoURL` - **Stored in CompanyStaff model for quick access**

**Key Architecture Point**: CompanyStaff is universal personhood for the company
- **NO athleteId** - CompanyStaff is NOT an athlete extension
- **Separate auth system** - Uses Firebase, not athlete auth
- **Direct companyId and role** - No junction table needed (single-tenant, one company)
- **Universal personhood** - Similar to `Contact` but for staff members
- **Role-based access** - Direct `role` field (founder, admin, manager, employee from roleConfig.js)
- **Verification code** - For employee onboarding (unique link with code)
- **Future**: If Firebase tokens lost, re-enter code (future: can change code)
- If staff wants to use GoFast app, they sign up separately as Athlete

### Contact Model (CRM - Universal Personhood)

```prisma
model Contact {
  id          String @id @default(cuid())
  companyId   String  // Links to GoFastCompany.id (containerId)
  
  // Core person data (aligned with Ignite pattern)
  firstName   String?
  lastName    String?
  goesBy      String?  // Preferred name
  email       String?
  phone       String?
  title       String?
  
  // Pipeline Tracking (via Pipeline model - config-based)
  pipelineId  String?  // Links to Pipeline.id (optional - contact may not be in pipeline yet)
  pipeline    Pipeline? @relation(fields: [pipelineId], references: [id])
  
  // Conversion Tracking
  athleteId   String?  // Optional: Link to Athlete if contact converted to athlete user
  
  // Notes
  notes       String?
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  company     GoFastCompany @relation(fields: [companyId], references: [id], onDelete: Cascade)
  
  @@map("contacts")
}
```

**Key Architecture Point**: Universal personhood with config-based pipeline
- **Aligned with Ignite** - Uses `contacts` model (broad, aligns with Ignite pattern)
- **Pipeline via Pipeline model** - Not direct fields, uses `pipelineId` → `Pipeline` model
- **Config-based** - Pipeline and stage defined in config tables (avoids unused models)
- **May become athletes** - `athleteId` link for conversion (relational connection)
- **No separate prospect/partner models** - All contacts, differentiated by pipeline/stage

### Pipeline Model (Config-Based Pipeline Tracking)

```prisma
model Pipeline {
  id          String @id @default(cuid())
  companyId   String  // Links to GoFastCompany.id (containerId)
  contactId   String  @unique  // One pipeline per contact
  
  // Pipeline Configuration (from config tables)
  pipeline    String  // Pipeline identifier (e.g., "product", "sales", "partnership")
  stage       String  // Stage identifier (e.g., "prospect", "qualified", "closed")
  
  // Pipeline Metadata
  status      String @default("active") // active, won, lost, paused
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  company     GoFastCompany @relation(fields: [companyId], references: [id], onDelete: Cascade)
  contact     Contact @relation(fields: [contactId], references: [id], onDelete: Cascade)
  
  @@map("pipelines")
}
```

**Key Architecture Point**: Config-based pipeline tracking
- **Separate Pipeline model** - Not direct fields on Contact
- **Config-based** - Pipeline and stage values come from config tables
- **One pipeline per contact** - `contactId` is unique
- **Avoids unused models** - No separate prospect/sales channel partner models
- **Differentiation by pipeline/stage** - Same contact model, different pipeline/stage values

### PipelineConfig Model (Pipeline/Stage Configuration)

```prisma
model PipelineConfig {
  id          String @id @default(cuid())
  companyId   String  // Links to GoFastCompany.id (containerId)
  
  // Pipeline Configuration
  pipeline    String  // Pipeline identifier (e.g., "product", "sales", "partnership")
  stage       String  // Stage identifier (e.g., "prospect", "qualified", "closed")
  order       Int     // Order within pipeline (for display)
  
  // Display
  displayName String  // Human-readable name
  color       String? // Color for UI display
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  company     GoFastCompany @relation(fields: [companyId], references: [id], onDelete: Cascade)
  
  @@unique([companyId, pipeline, stage])
  @@map("pipeline_configs")
}
```

**Key Architecture Point**: Config-based pipeline/stage definitions
- **Defined in config table** - Not hardcoded
- **Company-scoped** - Each company can have custom pipelines/stages
- **For now**: Product pipeline is the focus (founder wants pipeline module and display)

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

### CompanyRoadmapItem

```prisma
model CompanyRoadmapItem {
  id          String @id @default(cuid())
  companyId   String  // Links to GoFastCompany.id (containerId)
  
  roadmapType String // "product", "gtm", "operations"
  quarter     String? // "Q4 2025"
  title       String
  description String?
  status      String @default("pending") // pending, in_progress, completed, cancelled
  dueDate     DateTime?
  completedAt DateTime?
  
  company     GoFastCompany @relation(fields: [companyId], references: [id], onDelete: Cascade)
  
  @@map("company_roadmap_items")
}
```

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

```
GET    /api/company/hydrate           → Hydrate GoFastCompany + all relations (single company)
GET    /api/company                   → Get GoFastCompany details
POST   /api/company/create            → Create GoFastCompany (founder only - during onboarding)
PUT    /api/company                   → Update GoFastCompany (founder only)
```

### Contact Routes (CRM - Aligned with Ignite Pattern)

```
GET    /api/contacts?pipeline={pipeline}&stage={stage}  // Filter by pipeline/stage
GET    /api/contacts/:contactId                       // Single contact detail
POST   /api/contacts                                  // Create contact
PUT    /api/contacts/:contactId                      // Update contact
DELETE /api/contacts/:contactId                       // Delete contact

POST   /api/contacts/:contactId/convert-to-athlete   // Convert contact → Athlete user
```

### BD Pipeline Routes (Contact-Driven, Config-Based)

```
GET    /api/pipelines                                 // Get all BD pipeline configs
GET    /api/pipelines/:pipelineId                    // Get BD pipeline config
POST   /api/pipelines                                 // Create BD pipeline config
PUT    /api/pipelines/:pipelineId                    // Update BD pipeline config

GET    /api/contacts?pipeline={pipeline}&stage={stage}  // Get contacts in BD pipeline
POST   /api/contacts/:contactId/pipeline             // Assign contact to BD pipeline/stage
PUT    /api/contacts/:contactId/pipeline             // Update contact BD pipeline/stage
```

**Key Routes**: BD Pipeline (contact-driven, config-based)
- `GET /api/contacts?pipeline=bd&stage=prospect` - Get contacts in BD pipeline
- Pipeline/stage display based on PipelineConfig

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

### Roadmap Routes

```
GET    /api/company/roadmap                          // Get roadmap items
POST   /api/company/roadmap                          // Create roadmap item
PUT    /api/company/roadmap/:itemId                  // Update roadmap item
DELETE /api/company/roadmap/:itemId                  // Delete roadmap item
```

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
  - NOT contact-driven (different from BD pipeline)
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
   - `containerId` = Unique identifier for all GoFast operations
   - No multi-tenancy - just GoFast company
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

4. **Two Separate Pipeline Systems**
   - **BD Pipeline** = Contact-driven, config-based (`Pipeline` model linked to `Contact`)
   - **Product Pipeline** = Product module, user-driven (`ProductPipelineItem` model - NOT linked to contacts)
   - **BD Pipeline**: `Pipeline` model for contact pipeline/stage tracking (config-based)
   - **Product Pipeline**: `ProductPipelineItem` model with name, description, timeItTakes (user input)
   - **Different purposes**: BD Pipeline = CRM/sales tracking. Product Pipeline = Product development tracking
   - **Product pipeline is main focus** (founder wants product pipeline module and display)

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
2. ✅ **containerId** = Unique identifier for all GoFast operations (GoFastCRM, GoFastFinance)
3. ✅ **CompanyStaff = Company Auth** - Separate from Athlete identity
4. ✅ **Contacts = Universal Personhood** - Aligned with Ignite pattern, may become athletes
5. ✅ **Config-Based Pipeline** - Pipeline/stage via config tables (avoids unused models)
6. ✅ **Two Pipeline Systems** - BD Pipeline (contact-driven, config-based) vs Product Pipeline (product module, user-driven with name, description, timeItTakes)
7. ✅ **Product Pipeline Focus** - Founder wants product pipeline module and display (main focus now)
7. ✅ **Role Hardcoded** - For now, hardcode role as "founder" (config will follow)
8. ✅ **Onboarding Flow** - GF Splash → Code verify → Company upsert → Profile setup → Platform
9. ✅ **Built on GoFast Backend** - Easier athlete conversion, future security separation

---

**Last Updated**: January 2025  
**Architecture Pattern**: Single-Tenant Company-First with Separate Auth & Config-Based Pipeline  
**Container**: GoFastCompany (single record with containerId)  
**Auth Model**: CompanyStaff (Firebase) - separate from Athlete identity  
**Access Control**: Role-based via direct `role` field on `CompanyStaff` (hardcoded "founder" for now, config-based in future)  
**CRM Pattern**: Contacts with config-based BD pipeline/stage tracking (aligned with Ignite)  
**Product Pipeline**: User-driven product module tracking (name, description, timeItTakes)  
**Current Focus**: Product Pipeline Module (user-driven, NOT contact-driven)
