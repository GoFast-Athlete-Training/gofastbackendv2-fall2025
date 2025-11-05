# RunCrew Frontend Fixes Needed

## Issue: AthleteHome Shows "Join" Even When User Has Crews

### Problem
AthleteHome doesn't check if user already belongs to a RunCrew, so it always shows "Join/Create" buttons instead of "Go to RunCrew Central".

### Solution

#### 1. Check User's Crews on AthleteHome Load

```javascript
// In AthleteHome.jsx component
useEffect(() => {
  const fetchMyCrews = async () => {
    try {
      const token = await getAuthToken(); // Firebase token
      const response = await fetch('/api/runcrew/mine', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      
      if (data.success && data.count > 0) {
        // User has crews - show "Go to RunCrew Central" button
        setHasCrews(true);
        setMyCrews(data.runCrews);
      } else {
        // No crews - show "Join/Create" buttons
        setHasCrews(false);
      }
    } catch (error) {
      console.error('Error fetching crews:', error);
    }
  };
  
  fetchMyCrews();
}, []);
```

#### 2. Conditional Rendering

```javascript
// In AthleteHome.jsx render
{hasCrews ? (
  <div>
    <h2>Your Run Crews</h2>
    <button onClick={() => navigate('/runcrew-central')}>
      Go to RunCrew Central
    </button>
    {myCrews.map(crew => (
      <div key={crew.id}>
        <h3>{crew.name}</h3>
        <p>Members: {crew.memberCount}</p>
        <button onClick={() => navigate(`/runcrew-central?crewId=${crew.id}`)}>
          View Crew
        </button>
      </div>
    ))}
  </div>
) : (
  <div>
    <h2>Start Your Crew</h2>
    <button onClick={() => navigate('/form-run-crew')}>
      Create Run Crew
    </button>
    <button onClick={() => navigate('/run-crew-join')}>
      Join a Crew
    </button>
  </div>
)}
```

#### 3. Navigation Routes

- **Has Crews**: Navigate to `/runcrew-central` (with hyphen)
- **No Crews**: Show "Create" and "Join" buttons

### API Endpoint

**GET `/api/runcrew/mine`**
- Requires: Firebase token in `Authorization: Bearer <token>` header
- Returns: 
  ```json
  {
    "success": true,
    "runCrews": [
      {
        "id": "crew-id",
        "name": "Crew Name",
        "joinCode": "CODE123",
        "memberCount": 5,
        "isAdmin": true,
        "joinedAt": "2025-01-20T...",
        "admin": { ... },
        "memberships": [ ... ]
      }
    ],
    "count": 1
  }
  ```

### Related Issues

1. **After Create Redirect**: Currently redirects to `/runcrew-home` (deprecated) → Should redirect to success page then `/runcrew-central`
2. **RunCrew Central Route**: Use `/runcrew-central` (with hyphen, not underscore)

---

**Last Updated**: January 2025
**Status**: ⚠️ Frontend fixes needed

