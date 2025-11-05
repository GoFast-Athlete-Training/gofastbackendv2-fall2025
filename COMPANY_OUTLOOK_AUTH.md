# Company Outlook Auth Flow

## 🎯 **INVITATION-BASED ACCESS ONLY**

**CRITICAL**: Company Outlook requires invitation. No open signup.

---

## Auth Flow Architecture

### **1. SPLASH PAGE** (`Splash.jsx`)
**Purpose**: Entry point - invitation verification and login

**Flow**:
1. User visits `/splash` (or routed from any protected route)
2. Check for invitation token:
   - URL param: `?token=xxx`
   - localStorage: `company_invite_token`
3. If token found:
   - Call `/api/company/invite/verify?token=xxx`
   - Show login form with role/department pre-filled from invite
4. If no token:
   - Show "Invitation Required" message
   - Display token entry form

---

## Backend Endpoints

### **Verify Invitation**
```
GET /api/company/invite/verify?token={token}
```
**Response**:
```json
{
  "success": true,
  "invite": {
    "companyId": "company_123",
    "companyName": "GoFast Company",
    "email": "adam@example.com",  // May be pre-filled
    "role": "founder",            // founder, admin, manager, employee
    "department": "Executive",
    "status": "pending",
    "expiresAt": "2025-02-01T00:00:00Z"
  }
}
```

### **Accept Invitation & Login**
```
POST /api/company/invite/accept
Body: { email, token }
```
**Response**:
```json
{
  "success": true,
  "employee": {
    "id": "emp_123",
    "companyId": "company_123",
    "email": "adam@example.com",
    "name": "Adam",
    "role": "founder",
    "department": "Executive"
  },
  "auth": {
    "companyId": "company_123",
    "email": "adam@example.com",
    "role": "founder",
    "department": "Executive"
  }
}
```

---

## Frontend Auth State

### **Storage**
```javascript
// Invitation token (from URL or entered)
localStorage.setItem('company_invite_token', token)

// Auth data (after login)
localStorage.setItem('company_auth', JSON.stringify({
  companyId: 'company_123',
  companyName: 'GoFast Company',
  email: 'adam@example.com',
  role: 'founder',
  department: 'Executive',
  inviteToken: 'xxx',
  loginTime: '2025-01-01T00:00:00Z'
}))
```

### **Protected Routes**
```javascript
// Check auth in Layout component
useEffect(() => {
  const auth = localStorage.getItem('company_auth')
  if (!auth) {
    navigate('/splash')
  }
}, [])

// Logout
const handleLogout = () => {
  localStorage.removeItem('company_auth')
  localStorage.removeItem('company_invite_token')
  navigate('/splash')
}
```

---

## Role-Based Navigation

Navigation items filtered by role + department:

```javascript
const getMainNavItems = () => {
  const allItems = [
    { 
      to: '/', 
      label: 'Company Hub', 
      roles: ['founder', 'admin', 'manager', 'employee'] 
    },
    { 
      to: '/roadmap', 
      label: 'Product Roadmap', 
      roles: ['founder', 'admin', 'manager'], 
      departments: ['Product', 'Engineering'] 
    },
    { 
      to: '/financial-projections', 
      label: 'Financial Projections', 
      roles: ['founder', 'admin'],
      departments: ['Finance', 'Executive']
    },
    // ... etc
  ]
  
  return allItems.filter(item => {
    if (!item.roles.includes(userRole)) return false
    if (item.departments && !item.departments.includes(userDepartment)) return false
    return true
  })
}
```

---

## Database Models

### **CompanyInvite** (Invitation)
```prisma
model CompanyInvite {
  id        String @id @default(cuid())
  companyId String
  
  email     String      // Invitee email
  token     String @unique // Unique invitation token
  
  role      String? // founder, admin, manager, employee
  department String?
  
  status    String @default("pending") // pending, accepted, expired, revoked
  expiresAt DateTime?
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  company   Company @relation(fields: [companyId], references: [id])
  
  @@unique([companyId, email, token])
  @@map("company_invites")
}
```

### **CompanyEmployee** (Auth State)
```prisma
model CompanyEmployee {
  id          String @id @default(cuid())
  companyId   String
  
  email       String
  name        String
  role        String? // founder, admin, manager, employee
  department  String?
  
  joinedAt    DateTime @default(now())
  
  company     Company @relation(fields: [companyId], references: [id])
  
  @@unique([companyId, email])
  @@map("company_employees")
}
```

---

## Key Points

1. **Invitation-Only**: No open signup
2. **Token-Based**: Unique tokens in invitation URLs
3. **Email + Token**: Verifies both email and valid invitation
4. **Role/Department**: Set at invitation time
5. **Expiration**: Invites can expire for security
6. **LocalStorage**: Simple client-side auth (for MVP, upgrade to JWT later)
7. **Auto-Redirect**: Unauthenticated users → `/splash`

---

**Status**: ✅ Clean auth architecture ready
**Next**: Build backend endpoints → Connect frontend to backend

