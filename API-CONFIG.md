# GoFast Backend API Configuration

## 🎯 **THE 3 ACTUAL API CALLS**

### 1. **CREATE ATHLETE** 
- **Route**: `POST /api/athlete/create`
- **File**: `routes/Athlete/athleteRoute.js`
- **Purpose**: Create new athlete from Firebase sign-in
- **Used by**: MVP1 signup/signin pages

### 2. **HYDRATE ALL ATHLETES** (Container Query)
- **Route**: `GET /api/athlete/admin/hydrate` 
- **File**: `routes/Athlete/athleteHydrateRoute.js`
- **Purpose**: Get all athletes for admin dashboard
- **Used by**: AdminHome, AdminAthletes pages

### 3. **UPDATE ATHLETE PROFILE**
- **Route**: `PUT /api/athlete/:id/profile`
- **File**: `routes/Athlete/athleteProfileRoute.js` 
- **Purpose**: Save profile form data to athlete
- **Used by**: Profile setup forms

## 🔧 **CLEAN NAMING CONVENTION**

```
athleteCreateRoute.js    → POST /api/athlete/create
athleteHydrateRoute.js   → GET /api/athlete/admin/hydrate  
athleteProfileRoute.js   → PUT /api/athlete/:id/profile
```

## 📊 **DATA FLOW**

```
1. Firebase Sign-in → athleteCreateRoute → Create athlete
2. Admin Dashboard → athleteHydrateRoute → Get all athletes
3. Profile Form → athleteProfileRoute → Update athlete profile
```

## 🚀 **IMPLEMENTATION STATUS**

- ✅ **athleteCreateRoute**: Working (MVP1 signup/signin)
- ✅ **athleteHydrateRoute**: Working (admin dashboard)  
- ✅ **athleteProfileRoute**: Working (profile forms)

---
*Clean, simple, documented - no more confusion!*
