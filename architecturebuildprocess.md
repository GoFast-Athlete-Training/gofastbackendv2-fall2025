# Architecture Build Process

## Premise

When starting a new build or doing new UX work, **Adam prefers to think it through first** and document it in a `.md` file. This helps Cursor/IDE refer back to patterns and maintain consistency.

**Architecture docs serve as the source of truth** - not proposals, but definitive specifications.

**Key Point**: Architecture = **Schema Architecture** (data models, relationships) - NOT page architecture. Schema comes FIRST, then pages follow from schema.

---

## Architecture Documentation Purpose

Architecture docs are **schema-first** - they define the data layer before anything else. They answer three critical questions:

### 1. Overall Containers/Models - What Goes In Them
- What data models exist in Prisma schema?
- What fields do they have?
- What is their purpose?
- Example: `Company` model has `name`, `address`, `website`

### 2. How They Relate - Who Owns Who
- Relationships between models
- Junction tables, foreign keys
- Cascade rules, constraints
- Example: `CompanyFounder` links `Company` → `Founder` → `Athlete`

### 3. Thinking Through - What Data Do We Need?
- What hydration routes exist?
- What upsert capabilities?
- What backend routes are needed?
- **Then**: What frontend pages follow from these models? (Models = Pages)

---

## Architecture Doc Structure

**Schema-First Approach**: Define Prisma models and relationships FIRST, then backend routes, then frontend pages follow.

### Example: Company Outlook Architecture

```markdown
# Company Outlook Architecture

## Data Models (Prisma Schema) - SCHEMA FIRST!
- Company (name, address, website)
- CompanyFounder (junction: companyId, founderId)
- CompanyEmployee (email, name, role - NO athleteId)
- CompanyRoadmapItem (roadmapType, quarter, title)
- CompanyCrmContact (name, pipeline, status)
- Task (unified: founderId OR companyId)

## Relationships - SCHEMA FIRST!
- Company → CompanyFounder → Founder → Athlete
- Company → CompanyEmployee (email-based, no athleteId)
- Company → Task (companyId set, founderId null)

## Backend Routes (Follow from Schema)
- GET /api/company/:companyId/hydrate
- GET /api/company-crm?companyId=X
- POST /api/company/:companyId/roadmap

## Frontend Pages (Follow from Models = Pages Pattern)
- CompanyAdminNav (hub)
- ProductRoadmap (from CompanyRoadmapItem)
- CompanyTasks (from Task where companyId)
- CompanyCrmHub → CompanyCrmList (from CompanyCrmContact)
```

---

## When to Create Architecture Doc

1. **New Build** - Before scaffolding any frontend/backend
2. **New Feature** - When adding significant functionality
3. **Refactoring** - When restructuring existing systems
4. **Integration** - When connecting systems

---

## Architecture as Source of Truth

- ✅ **Source of Truth**: Architecture doc is definitive
- ✅ **Reference Point**: Cursor/IDE uses it for patterns
- ✅ **Living Document**: Can be updated/deleted as needed
- ❌ **Not a Proposal**: It's the specification, not a suggestion

---

## Process Flow (Schema-First)

```
1. User (Adam) thinks through SCHEMA architecture
   ↓
2. Creates/updates architecture.md doc (Prisma models, relationships)
   ↓
3. Update Prisma schema.prisma (create models)
   ↓
4. Create backend routes (hydration, CRUD)
   ↓
5. Frontend pages follow from schema (Models = Pages)
   ↓
6. Cursor references architecture doc for patterns
   ↓
7. Update doc if schema evolves
```

**Order Matters**: Schema → Backend Routes → Frontend Pages

---

## Example Architecture Docs

- `COMPANY_OUTLOOK_ARCHITECTURE.md` - Company Outlook system
- `FOUNDER_STACK_ARCHITECTURE.md` - Founder Stack system
- `ATHLETE_UPDATE_ARCHITECTURE.md` - Athlete update patterns

---

## Key Points

1. **Architecture = Schema Architecture** - Data models and relationships FIRST
2. **Schema-First Approach** - Define Prisma models before pages
3. **Source of Truth** - Not proposals, definitive specifications
4. **Models = Pages** - Frontend pages follow from schema models
5. **Thinking Tool** - Helps Adam think through data structure before building

**Process**: Schema Architecture → Prisma Schema → Backend Routes → Frontend Pages

