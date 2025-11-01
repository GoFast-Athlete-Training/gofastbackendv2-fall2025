# Product Time to Complete Estimates

## Premise

This document helps estimate development time for roadmap features. We're solo dev with Cursor (~12 hours/day capacity).

**Key Assumptions:**
- Solo dev with Cursor AI assistance
- ~12 hours per day available
- Estimates based on typical development patterns

---

## Time Estimate Framework

### Frontend Demo (Scaffolding)
- **4 hours**: Simple page with mock data, basic layout
- **6 hours**: Page with multiple components, routing
- **8 hours**: Complex demo with forms, interactions, data flow

### Backend Scaffolding
- **2 hours**: Simple CRUD routes (one model, basic endpoints)
- **4 hours**: Moderate routes (multiple endpoints, validation)
- **8 hours**: Complex routes (hydration, upsert, relationships)
- **12 hours**: Universal systems (generic upsert, admin hydration)

### API Integration
- **2 hours**: Simple external API (single endpoint, no auth)
- **4 hours**: Moderate integration (auth, multiple endpoints)
- **8 hours**: Complex integration (OAuth, webhooks, rate limiting)
- **12+ hours**: Enterprise integration (multiple services, sync)

### User Testing
- **4 hours**: Setup testing framework, basic tests
- **8 hours**: Comprehensive testing (edge cases, error handling)
- **12 hours**: Full test suite (integration, E2E)

### Release
- **8 hours**: App store setup, screenshots, descriptions
- **12 hours**: Full release process (beta, production, rollback)

---

## Complexity Factors

### What Makes Things Take Longer

**+2 hours:**
- Complex data relationships
- Multiple user roles/permissions
- Real-time features (websockets)
- Payment integration

**+4 hours:**
- Third-party integrations (research, accounts, auth)
- Mobile-specific features (push notifications)
- Analytics and tracking
- Internationalization

**+8+ hours:**
- Security vulnerabilities to address
- Performance optimization
- Major refactoring
- Complex algorithms

---

## Product Velocity Calculations

**Single Dev (~12hrs/day):**
- **Hours per week**: 84 hours
- **Hours per month**: ~360 hours
- **Features/month**: Varies by complexity

**Two Devs (~24hrs/day):**
- **2x velocity** (rough estimate)
- Better for parallel work (frontend/backend split)

**Three Devs (~36hrs/day):**
- **~2.5x velocity** (communication overhead)
- Specialization benefits (frontend/backend/mobile)

---

## Reality Check

**Typical Roadblocks:**
- **Third-party APIs**: +4-8 hours for research, signup, auth, testing
- **Undocumented features**: +4 hours for reverse engineering
- **Design revisions**: +2-4 hours per round
- **Bug fixes**: Varies (simple = 30min, complex = 4+ hours)
- **Deployment issues**: +2-6 hours typically

---

## Sample Estimates

### RunCrew MVP Features

**Join/Create RunCrew:**
- Backend routes: 4 hours
- Frontend: 6 hours
- Testing: 4 hours
- **Total: 14 hours**

**Activity Tracking Integration:**
- Strava/Garmin research: 4 hours
- Backend routes: 6 hours
- Frontend display: 8 hours
- **Total: 18 hours**

**Leaderboards:**
- Backend aggregation: 6 hours
- Frontend display: 8 hours
- **Total: 14 hours**

---

## Next Steps

1. Review actual hours spent vs. estimates
2. Adjust framework based on real data
3. Use this to project velocity
4. Help plan hiring (when do we need more devs?)

---

**This is a living document** - update with actual time data as we build.

