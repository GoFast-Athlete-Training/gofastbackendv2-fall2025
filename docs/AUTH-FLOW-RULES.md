# GoFast Auth Flow Rules

## 🎯 **CLEAR RULES**

### **SIGNUP PAGE** (`SignupPage.jsx`)
- **Purpose**: Create new users
- **Backend Logic**: **FIND OR CREATE**
- **Flow**: 
  1. Firebase sign-in
  2. Call `/api/athlete/create` 
  3. If user exists → Link Firebase ID
  4. If user doesn't exist → Create new athlete
  5. Show success popup

### **SIGNIN PAGE** (`Signin.jsx`) 
- **Purpose**: Login existing users
- **Backend Logic**: **FIND ONLY**
- **Flow**:
  1. Firebase sign-in
  2. Call `/api/athlete/find` (new endpoint)
  3. If user exists → Show success popup
  4. If user doesn't exist → **Redirect to signup page**

## 🔧 **BACKEND ENDPOINTS NEEDED**

### **Current**: `/api/athlete/create` (FIND OR CREATE)
- Used by: **Signup page**
- Logic: Find by firebaseId → Find by email → Create if not found

### **Needed**: `/api/athlete/find` (FIND ONLY)
- Used by: **Signin page** 
- Logic: Find by firebaseId → Find by email → Return 404 if not found

## 📝 **IMPLEMENTATION PLAN**

1. **Keep** `/api/athlete/create` as-is (find or create)
2. **Create** `/api/athlete/find` (find only)
3. **Update** `Signin.jsx` to call `/api/athlete/find`
4. **Add** redirect to signup if user not found

## 🎉 **CURRENT STATUS**
- ✅ **Signup working**: Creates/finds users successfully
- ❌ **Signin needs**: New find-only endpoint + redirect logic

---
*This document prevents confusion about which page does what!*

