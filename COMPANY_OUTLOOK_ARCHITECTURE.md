# Company Outlook Architecture

## Schema-First Approach

**This is the source of truth** for Company Outlook data models and relationships. Schema comes FIRST, then backend routes, then frontend pages.

## Architecture Principle: Items vs Totals

**CRITICAL**: Everything in architecture is about **what we're ingesting**:
- **Individual Items** - Individual records/transactions we store (e.g., each spend transaction)
- **Total Values** - Aggregated/summary data we store or calculate (e.g., total spending per month)

**For every model, ask**:
1. What individual items are we ingesting?
2. What total values do we need to calculate or store?

This is why architecture is so important - it defines the data ingestion pattern for each model.

---

## Data Models (Prisma Schema)

### Company Model
```prisma
model Company {
  id        String @id @default(cuid())
  name      String
  address   String?
  website   String?
  
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

### CompanyFounder Junction
```prisma
model CompanyFounder {
  id        String @id @default(cuid())
  companyId String
  founderId String // Links to Founder.id → Athlete.id (for founders who test)
  
  role      String? // "CEO", "Co-Founder"
  joinedAt  DateTime @default(now())
  
  company   Company @relation(fields: [companyId], references: [id], onDelete: Cascade)
  founder   Founder @relation(fields: [founderId], references: [id], onDelete: Cascade)
  
  @@unique([companyId, founderId])
  @@map("company_founders")
}
```

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

### CompanyCrmContact (BD/Clubs Focus)
```prisma
model CompanyCrmContact {
  id        String @id @default(cuid())
  companyId String
  
  // Contact Info
  name      String
  role      String? // "Club Director", "Partnership Lead", etc.
  email     String?
  company   String? // Their company (club/organization name)
  
  // Pipeline Management (BD Focus - Clubs, Partners, Integrations)
  pipeline  String @default("prospects") // prospects, warm, onboarding, active, churned
  status    String @default("new") // new, warm, active, exploring, cold
  
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

### Task (Unified - Founder OR Company)
```prisma
model Task {
  id        String @id @default(cuid())
  
  // Polymorphic Link - ONE of these must be set
  founderId String?  // For founder personal tasks (Adam's tasks)
  companyId String?  // For company-wide tasks
  
  // Task Details
  title       String
  description String?
  status      String @default("pending") // pending, in_progress, completed, cancelled
  priority    String @default("medium") // low, medium, high, urgent
  dueDate     DateTime?
  
  // Department (for company tasks)
  department  String? // "Engineering", "Design", "Marketing"
  
  // Founder Priority Flag (for company tasks)
  isTopPriority Boolean @default(false) // Founder can mark "most important now"
  
  // Completion
  completedAt DateTime?
  
  // System
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  // Relations
  founder Founder? @relation(fields: [founderId], references: [id], onDelete: Cascade)
  company Company? @relation(fields: [companyId], references: [id], onDelete: Cascade)
  
  @@map("tasks")
}
```

---

## Relationships Summary

### Company Relationships
- `Company` → `CompanyFounder[]` → `Founder` → `Athlete` (for founders who test)
- `Company` → `CompanyEmployee[]` (email-based, NO athleteId)
- `Company` → `CompanyRoadmapItem[]` (product/GTM/ops roadmap)
- `Company` → `Task[]` (companyId set, founderId null)
- `Company` → `CompanyCrmContact[]` (BD/clubs pipeline)
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

## Backend Routes (Follow from Schema)

### Company Routes
```
GET    /api/company/:companyId/hydrate          // Hydrate company + all relations
GET    /api/company/:companyId                 // Get company details
POST   /api/admin/upsert?model=company         // Create company record
```

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

### CRM Routes (Modular Hydration)
```
GET    /api/company-crm?companyId={companyId}            // All company CRM contacts
GET    /api/company-crm/:contactId                       // Single contact detail
POST   /api/company-crm                                  // Create contact
PUT    /api/company-crm/:contactId                        // Update contact
DELETE /api/company-crm/:contactId                       // Delete contact
GET    /api/company-crm?companyId=X&pipeline=prospects   // Filtered by pipeline
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

### CRM Pages
- `CompanyCrmHub.jsx` - CRM hub
- `CompanyCrmList.jsx` (HydratedPage) - Contact list
- `CompanyCrmCreate.jsx` (CreatePage) - Create contact
- `CompanyCrmDetail.jsx` (ViewDetail) - Contact detail

### Other Pages
- `UserMetrics.jsx` - Read-only user counts (from dashboard routes)
- `PitchDeck.jsx` - Investor pitch deck
- `Marketing.jsx` - Outreach/Google Ads (MVP1)

---

## Key Architectural Decisions

1. **Separate Spend vs Projection Models - Items vs Totals**
   - `CompanyFinancialSpend` = **Individual items** (transactions we ingest)
   - `CompanyFinancialProjection` = **Total values** (aggregated budgets we ingest)
   - Different data ingestion patterns → Different models
   - **Architecture Question**: What are we ingesting? Items or totals?

2. **Email-Based Employees**
   - `CompanyEmployee` has NO `athleteId` (separate concern)
   - If employee wants app, they sign up separately as Athlete

3. **Unified Task Model**
   - One `Task` model with `founderId` OR `companyId` (polymorphic)
   - Avoids duplicate task models

4. **Modular Hydration**
   - Entity-specific routes (e.g., `/api/company-crm?companyId=X`)
   - Not generic hydration routes

5. **Schema-First**
   - Schema defines models FIRST
   - Backend routes follow from schema
   - Frontend pages follow from models (Models = Pages)

6. **Invitation-Based Access**
   - `CompanyInvite` model for access control
   - Users must be invited (no open signup)
   - Token-based invitation URLs
   - Role/department set at invitation time

---

**Status**: Schema architecture - source of truth for Company Outlook system.
**Next Steps**: Update Prisma schema.prisma → Create backend routes → Build frontend pages

