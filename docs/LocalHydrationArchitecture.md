# Local Hydration Architecture

## Overview
GoFast MVP1 uses a **local hydration pattern** where athlete data (including `athleteId`) is stored in `localStorage` and retrieved on every page load. This avoids repeatedly passing Firebase tokens and allows frontend components to access athlete data without API calls.

## The Hydration Flow

### 1. Initial Hydration (AthleteHome.jsx)

**When**: User lands on `/athlete-home` after authentication

**Process**:
```javascript
// 1. Firebase token verified on backend
const token = await user.getIdToken();

// 2. Call hydration endpoint
const response = await fetch('/api/athlete/athletepersonhydrate', {
  headers: { 'Authorization': `Bearer ${token}` }
});

// 3. Backend returns athlete data
const { athlete } = await response.json();
// athlete.athleteId or athlete.id contains the athlete ID

// 4. Store in localStorage
localStorage.setItem('athleteProfile', JSON.stringify(athlete));
localStorage.setItem('athleteId', athlete.athleteId || athlete.id); // Backup direct access
localStorage.setItem('profileHydrated', 'true');
```

### 2. localStorage Structure

**Key Values Stored**:
```javascript
localStorage.setItem('athleteId', athleteId);           // Direct athlete ID access
localStorage.setItem('athleteProfile', JSON.stringify({ // Full profile object
  athleteId: "...",
  firebaseId: "...",
  email: "...",
  firstName: "...",
  lastName: "...",
  // ... all other athlete fields
}));
localStorage.setItem('profileHydrated', 'true');
localStorage.setItem('onboardingState', JSON.stringify({...}));
```

**Why Both?**:
- `athleteId`: Quick access for API calls (most common use case)
- `athleteProfile`: Full data for UI rendering without API calls

### 3. Using athleteId in Components

**Pattern for API Calls**:
```javascript
// Get athleteId from localStorage
const athleteId = localStorage.getItem('athleteId');

if (!athleteId) {
  // User not hydrated - redirect to signin or hydrate
  navigate('/athlete-home');
  return;
}

// Use in API call
const response = await fetch(`/api/runcrew/create`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name,
    joinCode,
    athleteId // ← Send from localStorage
  })
});
```

**Pattern for UI Rendering**:
```javascript
// Get full profile from localStorage
const athleteProfile = JSON.parse(localStorage.getItem('athleteProfile') || '{}');

// Use directly in component
<h1>Welcome, {athleteProfile.firstName}!</h1>
```

## Backend Route Pattern

### Accepting athleteId from Request Body

**Why**: Frontend has `athleteId` in localStorage, so send it directly instead of verifying Firebase token again.

**Pattern**:
```javascript
// POST /api/runcrew/create
router.post('/create', async (req, res) => {
  const { name, joinCode, athleteId } = req.body;
  
  // Validate athleteId exists
  if (!athleteId) {
    return res.status(400).json({
      success: false,
      error: 'athleteId is required'
    });
  }
  
  // Verify athlete exists (optional but recommended)
  const athlete = await prisma.athlete.findUnique({
    where: { id: athleteId }
  });
  
  if (!athlete) {
    return res.status(404).json({
      success: false,
      error: 'Athlete not found'
    });
  }
  
  // Use athleteId for the operation
  const runCrew = await prisma.runCrew.create({
    data: {
      name,
      joinCode,
      runcrewAdminId: athleteId // ← Use from request
    }
  });
  
  // Create membership for admin
  await prisma.runCrewMembership.create({
    data: {
      runCrewId: runCrew.id,
      athleteId: athleteId,
      status: 'active'
    }
  });
});
```

### When to Verify Firebase Token vs Use athleteId

**Use Firebase Token Verification** (`verifyFirebaseToken` middleware):
- **Security-sensitive operations**: Delete, update critical data
- **When you need current auth state**: Verify user is still logged in
- **Initial hydration**: First-time data fetch

**Use athleteId from Request Body**:
- **Regular CRUD operations**: Create, read (non-sensitive)
- **Performance optimization**: Avoid token verification overhead
- **When localStorage is trusted**: MVP1 flow ensures athleteId is valid

**Example - Mixed Approach**:
```javascript
// Verify token for security, but also accept athleteId from body
router.post('/create', verifyFirebaseToken, async (req, res) => {
  const { name, joinCode, athleteId } = req.body;
  const firebaseId = req.user?.uid; // From token
  
  // Optional: Verify athleteId matches Firebase user
  const athlete = await prisma.athlete.findFirst({
    where: {
      id: athleteId,
      firebaseId: firebaseId
    }
  });
  
  if (!athlete) {
    return res.status(403).json({
      success: false,
      error: 'athleteId does not match authenticated user'
    });
  }
  
  // Proceed with operation
});
```

## Frontend Pattern

### Reading athleteId

**Standard Pattern**:
```javascript
// In any component
const athleteId = localStorage.getItem('athleteId');

if (!athleteId) {
  // Handle missing athleteId
  console.error('No athleteId in localStorage - user needs to hydrate');
  // Option 1: Redirect to hydrate
  navigate('/athlete-home');
  // Option 2: Show error
  setError('Please sign in again');
  return;
}

// Use athleteId in API calls
const response = await fetch('/api/some-endpoint', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ athleteId, ...otherData })
});
```

### Reading Full Profile

**Standard Pattern**:
```javascript
// Get full profile
const athleteProfileStr = localStorage.getItem('athleteProfile');
const athleteProfile = athleteProfileStr 
  ? JSON.parse(athleteProfileStr)
  : null;

if (!athleteProfile) {
  // Not hydrated - redirect or hydrate
  navigate('/athlete-home');
  return;
}

// Use profile data
const { firstName, lastName, email, gofastHandle } = athleteProfile;
```

## Error Handling

### Missing athleteId

**Frontend Check**:
```javascript
const athleteId = localStorage.getItem('athleteId');

if (!athleteId) {
  // Redirect to hydration
  navigate('/athlete-home');
  return;
}
```

**Backend Validation**:
```javascript
if (!athleteId) {
  return res.status(400).json({
    success: false,
    error: 'athleteId is required',
    message: 'Please ensure you are signed in'
  });
}
```

### Stale athleteId

**Backend Verification**:
```javascript
const athlete = await prisma.athlete.findUnique({
  where: { id: athleteId }
});

if (!athlete) {
  return res.status(404).json({
    success: false,
    error: 'Athlete not found',
    message: 'Please sign in again'
  });
}
```

## Security Considerations

### Trust but Verify

1. **Frontend sends athleteId**: Assume it's valid (from localStorage)
2. **Backend verifies**: Check athlete exists in database
3. **Optional token verification**: For sensitive operations, verify Firebase token matches athleteId

### Recommended Security Pattern

```javascript
// For sensitive operations (create, update, delete)
router.post('/create', verifyFirebaseToken, async (req, res) => {
  const { athleteId, ...data } = req.body;
  const firebaseId = req.user?.uid;
  
  // Verify athleteId matches authenticated Firebase user
  const athlete = await prisma.athlete.findFirst({
    where: {
      id: athleteId,
      firebaseId: firebaseId
    }
  });
  
  if (!athlete) {
    return res.status(403).json({
      success: false,
      error: 'Unauthorized'
    });
  }
  
  // Proceed with operation
});
```

## RunCrew Create Flow Example

**Frontend (CreateCrew.jsx)**:
```javascript
const handleCreate = async () => {
  // Get athleteId from localStorage
  const athleteId = localStorage.getItem('athleteId');
  
  if (!athleteId) {
    alert('Please sign in again');
    navigate('/athlete-home');
    return;
  }
  
  // Send to backend
  const response = await fetch('/api/runcrew/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name,
      joinCode,
      athleteId // ← From localStorage
    })
  });
};
```

**Backend (runcrewCreateRoute.js)**:
```javascript
router.post('/create', verifyFirebaseToken, async (req, res) => {
  const { name, joinCode, athleteId } = req.body;
  const firebaseId = req.user?.uid;
  
  // Verify athlete exists and matches Firebase user
  const athlete = await prisma.athlete.findFirst({
    where: {
      id: athleteId,
      firebaseId: firebaseId
    }
  });
  
  if (!athlete) {
    return res.status(403).json({
      success: false,
      error: 'Unauthorized'
    });
  }
  
  // Create RunCrew
  const runCrew = await prisma.runCrew.create({
    data: {
      name,
      joinCode,
      runcrewAdminId: athleteId
    }
  });
  
  // Create membership for admin
  await prisma.runCrewMembership.create({
    data: {
      runCrewId: runCrew.id,
      athleteId: athleteId,
      status: 'active'
    }
  });
  
  res.json({ success: true, runCrew });
});
```

## Benefits of This Pattern

1. **Performance**: Avoid repeated Firebase token verification
2. **Simplicity**: Frontend components can access athleteId easily
3. **Offline-ready**: localStorage persists across sessions
4. **Flexible**: Can still verify token when needed for security

## Drawbacks & Mitigations

1. **Stale Data**: localStorage can become outdated
   - **Mitigation**: Re-hydrate on AthleteHome every visit
   
2. **Security Risk**: athleteId sent in request body can be spoofed
   - **Mitigation**: Verify Firebase token + verify athleteId matches token

3. **Cross-tab Sync**: Changes in one tab don't update other tabs
   - **Mitigation**: Use localStorage events or re-hydrate on focus

## Best Practices

1. **Always check for athleteId** before API calls
2. **Re-hydrate on AthleteHome** to keep data fresh
3. **Verify token for sensitive ops** (create, update, delete)
4. **Handle missing athleteId gracefully** (redirect to signin)
5. **Store both athleteId and athleteProfile** for flexibility

