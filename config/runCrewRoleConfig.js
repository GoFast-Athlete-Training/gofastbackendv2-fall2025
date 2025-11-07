// RunCrew Role Configuration
// Defines roles for RunCrewManager model

export const RUNCREW_ROLES = {
  ADMIN: 'admin', // Owner/creator - full control
  MANAGER: 'manager' // Delegated manager - can create runs/events but not archive
};

export const RUNCREW_ROLE_LABELS = {
  [RUNCREW_ROLES.ADMIN]: 'Admin (Owner)',
  [RUNCREW_ROLES.MANAGER]: 'Manager'
};

export const RUNCREW_ROLE_OPTIONS = [
  { value: RUNCREW_ROLES.ADMIN, label: RUNCREW_ROLE_LABELS[RUNCREW_ROLES.ADMIN] },
  { value: RUNCREW_ROLES.MANAGER, label: RUNCREW_ROLE_LABELS[RUNCREW_ROLES.MANAGER] }
];

// Role hierarchy (for permission checks)
export const RUNCREW_ROLE_HIERARCHY = {
  [RUNCREW_ROLES.ADMIN]: 2, // Highest
  [RUNCREW_ROLES.MANAGER]: 1 // Lower
};

// Check if role1 has higher or equal permissions than role2
export const hasRoleOrHigher = (userRole, requiredRole) => {
  const userLevel = RUNCREW_ROLE_HIERARCHY[userRole] || 0;
  const requiredLevel = RUNCREW_ROLE_HIERARCHY[requiredRole] || 0;
  return userLevel >= requiredLevel;
};

// Check if user can perform admin actions
export const isAdmin = (role) => {
  return role === RUNCREW_ROLES.ADMIN;
};

// Check if user can perform manager actions
export const isManagerOrAdmin = (role) => {
  return role === RUNCREW_ROLES.ADMIN || role === RUNCREW_ROLES.MANAGER;
};

