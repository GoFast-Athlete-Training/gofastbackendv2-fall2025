# Company Stack Architecture Proposal

## Overview
Extend Founder Stack to include Company model for multi-founder/multi-member companies. Company manages product roadmap and company-wide tasks, while Founder keeps personal tasks and personal roadmap.

## Data Model Changes

### Company Model (New)
```prisma
model Company {
  id          String @id @default(cuid())
  name        String
  description String?
  
  // Company Identity
  website     String?
  logoUrl     String?
  industry    String?
  
  // System
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  // Relations
  founders        CompanyFounder[]     // Junction table for founders
  members         CompanyMember[]      // Junction table for employees/team
  productRoadmap  CompanyRoadmapItem[] // Product roadmap items
  companyTasks    CompanyTask[]        // Company-wide tasks
  
  @@map("companies")
}
```

### CompanyFounder Junction (New)
```prisma
model CompanyFounder {
  id        String   @id @default(cuid())
  companyId String
  founderId String
  
  // Role in company
  role      String?  // "CEO", "CTO", "Co-Founder", etc.
  title     String?  // "Co-Founder & CEO"
  equity    Float?   // Equity percentage (0-100)
  
  // Permissions
  isAdmin   Boolean  @default(true) // Founders are admins by default
  
  // Timestamps
  joinedAt  DateTime @default(now())
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  // Relations
  company Company @relation(fields: [companyId], references: [id], onDelete: Cascade)
  founder Founder @relation(fields: [founderId], references: [id], onDelete: Cascade)
  
  @@unique([companyId, founderId]) // One founder can only join a company once
  @@map("company_founders")
}
```

### CompanyMember Junction (New)
```prisma
model CompanyMember {
  id        String   @id @default(cuid())
  companyId String
  athleteId String   // Members are athletes (not founders)
  
  // Role/Employment
  role      String   // "Engineer", "Designer", "PM", etc.
  title     String?  // "Senior Software Engineer"
  department String?
  
  // Employment details
  startDate DateTime?
  endDate   DateTime? // null = active
  
  // Permissions
  isAdmin   Boolean  @default(false) // Members are not admins by default
  
  // Timestamps
  joinedAt  DateTime @default(now())
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  // Relations
  company Company @relation(fields: [companyId], references: [id], onDelete: Cascade)
  athlete Athlete @relation(fields: [athleteId], references: [id], onDelete: Cascade)
  
  @@unique([companyId, athleteId]) // One athlete can only join a company once
  @@map("company_members")
}
```

### CompanyRoadmapItem (New - for Product Roadmap)
```prisma
model CompanyRoadmapItem {
  id          String @id @default(cuid())
  companyId   String
  
  // Roadmap Classification
  roadmapType String @default("product") // product, gtm (company-level)
  
  // Product Roadmap Fields
  quarter     String? // "Q4 2025", "Q1 2026", "Q2 2026"
  epic        String? // "User Authentication", "Analytics Dashboard"
  
  // Item Details
  title       String
  description String?
  status      String @default("pending") // pending, in_progress, completed, cancelled
  
  // Ownership
  assignedTo  String? // athleteId or founderId
  
  // Dates
  dueDate     DateTime?
  completedAt DateTime?
  
  // System
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  // Relations
  company Company @relation(fields: [companyId], references: [id], onDelete: Cascade)
  
  @@map("company_roadmap_items")
}
```

### CompanyTask (New - for Company-wide Tasks)
```prisma
model CompanyTask {
  id          String   @id @default(cuid())
  companyId   String
  
  // Task Details
  title       String
  description String?
  status      String   @default("pending") // pending, in_progress, completed, cancelled
  priority    String   @default("medium") // low, medium, high, urgent
  
  // Ownership
  assignedTo  String? // athleteId or founderId
  createdBy   String  // founderId or athleteId who created
  
  // Dates
  dueDate     DateTime?
  completedAt DateTime?
  
  // System
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  // Relations
  company Company @relation(fields: [companyId], references: [id], onDelete: Cascade)
  
  @@map("company_tasks")
}
```

## Updated Models

### Founder Model (Update)
```prisma
model Founder {
  id        String @id @default(cuid())
  athleteId String @unique
  
  // System
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  // Relations
  athlete           Athlete            @relation(fields: [athleteId], references: [id], onDelete: Cascade)
  tasks             FounderTask[]      // Personal tasks (stays)
  crmContacts       CrmContact[]       // Personal CRM (stays)
  personalRoadmap   RoadmapItem[]      // Personal roadmap (stays - roadmapType: "personal")
  companyFounders    CompanyFounder[]   // Companies this founder belongs to (NEW)
  
  @@map("founders")
}
```

### RoadmapItem Model (Update)
```prisma
model RoadmapItem {
  id          String @id @default(cuid())
  founderId   String
  
  // Roadmap Classification
  roadmapType String // "personal", "gtm" (founder-level GTM, not company)
  
  // Personal Roadmap Fields
  category    String? // Mindset, Habits, Networking
  
  // Item Details
  title       String
  description String?
  status      String @default("pending")
  
  // Dates
  dueDate     DateTime?
  completedAt DateTime?
  
  // System
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  // Relations
  founder Founder @relation(fields: [founderId], references: [id], onDelete: Cascade)
  
  @@map("roadmap_items")
}
```

## Relationships Summary

### Founder Scope
- **Personal Tasks**: `FounderTask[]` - Only visible to founder
- **Personal Roadmap**: `RoadmapItem[]` where `roadmapType = "personal"` - Only visible to founder
- **GTM Roadmap**: `RoadmapItem[]` where `roadmapType = "gtm"` - Founder-level GTM (separate from company)
- **CRM**: `CrmContact[]` - Personal contacts
- **Companies**: `CompanyFounder[]` - Companies this founder belongs to

### Company Scope
- **Product Roadmap**: `CompanyRoadmapItem[]` - Visible to all company members
- **Company Tasks**: `CompanyTask[]` - Visible to all company members
- **Founders**: `CompanyFounder[]` - Founders in the company
- **Members**: `CompanyMember[]` - Employees/team members

## API Endpoints (Future)

### Company Routes
```
POST   /api/company/create              → Create company
GET    /api/company/:id                 → Get company details
PUT    /api/company/:id                 → Update company
DELETE /api/company/:id                 → Delete company

POST   /api/company/:id/founders        → Add founder to company
DELETE /api/company/:id/founders/:founderId → Remove founder
GET    /api/company/:id/founders        → List company founders

POST   /api/company/:id/members         → Add member to company
DELETE /api/company/:id/members/:athleteId → Remove member
GET    /api/company/:id/members         → List company members

GET    /api/company/:id/roadmap         → Get company product roadmap
POST   /api/company/:id/roadmap         → Create roadmap item
PUT    /api/company/:id/roadmap/:itemId → Update roadmap item

GET    /api/company/:id/tasks           → Get company tasks
POST   /api/company/:id/tasks           → Create company task
PUT    /api/company/:id/tasks/:taskId   → Update company task
```

## Migration Strategy

1. **Phase 1**: Add Company model + junctions
2. **Phase 2**: Create CompanyRoadmapItem for product roadmap
3. **Phase 3**: Create CompanyTask for company tasks
4. **Phase 4**: Update Founder routes to filter `RoadmapItem` by `roadmapType`
5. **Phase 5**: Build Company frontend integration

## Frontend Integration

### Founder Dashboard (gofastfounderoutlook)
- Personal Tasks (stays same)
- Personal Roadmap (stays same)
- **NEW**: Company selector → switch between companies
- **NEW**: Company Product Roadmap (reads from CompanyRoadmapItem)
- **NEW**: Company Tasks (reads from CompanyTask)

### Company Dashboard (new company repo)
- Company Overview
- Product Roadmap (CompanyRoadmapItem)
- Company Tasks (CompanyTask)
- Team Members (CompanyMember)
- Founders (CompanyFounder)

---

**Questions to Clarify:**
1. Can a founder belong to multiple companies? (Proposed: Yes via junction)
2. Are company members always athletes? (Proposed: Yes, via athleteId)
3. Should founder GTM roadmap merge with company product roadmap? (Proposed: Separate)
4. Real-time sync: WebSocket or polling? (To be determined)

