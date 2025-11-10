# GoFast Company Stack - Hydration Architecture

**Last Updated**: January 2025  
**Purpose**: What's hydrated and ready to use RIGHT NOW

---

## Hydration Flow

```
Splash → Welcome → Staff Hydrate → Check Company → Command Central
```

---

## ✅ What's Hydrated (Ready to Use)

### Staff Data
- `staff.firstName` - First name
- `staff.lastName` - Last name  
- `staff.email` - Email
- `staff.role` - Role (Founder, CFO, etc.)
- `staff.photoURL` - Photo URL
- `staff.startDate` - Start date
- `staff.salary` - Salary

### Company Data
- `company.companyName` - Company name
- `company.address` - Address
- `company.city` - City
- `company.state` - State
- `company.website` - Website
- `company.description` - Description

### Company Relations (Available via `/api/company/hydrate`)
- `company.contacts[]` - CRM contacts (100 latest)
- `company.productPipelineItems[]` - Product roadmap (100 latest)
- `company.roadmapItems[]` - Company roadmap (all)
- `company.tasks[]` - Company tasks (100 latest)
- `company.financialSpends[]` - Spending transactions (100 latest)
- `company.financialProjections[]` - Financial projections (50 latest)
- `company.staff[]` - All staff members

---

## Hook: `useHydratedStaff`

**Location**: `gofast-companystack/src/hooks/useHydratedStaff.js`

**Usage**:
```javascript
import useHydratedStaff from '../hooks/useHydratedStaff';

const { staff, company, staffId, companyId, role } = useHydratedStaff();
```

**Returns**:
- `staff` - Full staff object
- `company` - Full company object (with relations if hydrated)
- `staffId` - Staff ID
- `companyId` - Company ID (falls back to hardcoded ID)
- `role` - Staff role

---

## API Endpoints

### `GET /api/staff/hydrate`
- Returns: Staff + basic company info
- Used by: Welcome page

### `GET /api/company/hydrate`  
- Returns: Full company + all relations
- Used by: Command Central (when needed)

---

## localStorage Keys

- `gfcompany_staff` - Staff object
- `gfcompany_staffId` - Staff ID
- `gfcompany_company` - Company object
- `gfcompany_companyId` - Company ID
- `gfcompany_role` - Staff role

---

## Notes

- **Single Tenant**: One company (ID: `cmhpqe7kl0000nw1uvcfhf2hs`)
- **Hardcoded Company ID**: In `config/goFastCompanyConfig.js` (backend) and `constants/company.js` (frontend)
- **Revenue**: Only projected revenue in `financialProjections[].projectedRevenue` (no actual revenue transactions yet)

