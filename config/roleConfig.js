/**
 * Role Configuration for Company Staff
 * 
 * Defines all available roles, their permissions, and hierarchy
 * Used for access control and validation throughout the application
 */

export const ROLES = {
  FOUNDER: 'founder',
  ADMIN: 'admin',
  MANAGER: 'manager',
  EMPLOYEE: 'employee'
};

/**
 * Role Hierarchy (higher number = more permissions)
 */
export const ROLE_HIERARCHY = {
  [ROLES.FOUNDER]: 4,
  [ROLES.ADMIN]: 3,
  [ROLES.MANAGER]: 2,
  [ROLES.EMPLOYEE]: 1
};

/**
 * Role Permissions Configuration
 * Each role has specific permissions for different features
 */
export const ROLE_PERMISSIONS = {
  [ROLES.FOUNDER]: {
    // Company Management
    canEditCompanySettings: true,
    canDeleteCompany: true,
    canManageRoles: true,
    canInviteStaff: true,
    
    // CRM
    canViewCRM: true,
    canEditCRM: true,
    canDeleteCRM: true,
    canConvertContacts: true,
    
    // Financials
    canViewFinancials: true,
    canEditFinancials: true,
    canDeleteFinancials: true,
    
    // Roadmap
    canViewRoadmap: true,
    canEditRoadmap: true,
    canDeleteRoadmap: true,
    
    // Tasks
    canViewAllTasks: true,
    canEditAllTasks: true,
    canDeleteAllTasks: true,
    canAssignTasks: true,
    
    // Employees
    canViewEmployees: true,
    canEditEmployees: true,
    canDeleteEmployees: true
  },
  
  [ROLES.ADMIN]: {
    // Company Management
    canEditCompanySettings: false,
    canDeleteCompany: false,
    canManageRoles: true,
    canInviteStaff: true,
    
    // CRM
    canViewCRM: true,
    canEditCRM: true,
    canDeleteCRM: true,
    canConvertContacts: true,
    
    // Financials
    canViewFinancials: true,
    canEditFinancials: true,
    canDeleteFinancials: false,
    
    // Roadmap
    canViewRoadmap: true,
    canEditRoadmap: true,
    canDeleteRoadmap: false,
    
    // Tasks
    canViewAllTasks: true,
    canEditAllTasks: true,
    canDeleteAllTasks: false,
    canAssignTasks: true,
    
    // Employees
    canViewEmployees: true,
    canEditEmployees: true,
    canDeleteEmployees: false
  },
  
  [ROLES.MANAGER]: {
    // Company Management
    canEditCompanySettings: false,
    canDeleteCompany: false,
    canManageRoles: false,
    canInviteStaff: false,
    
    // CRM
    canViewCRM: true,
    canEditCRM: true,
    canDeleteCRM: false,
    canConvertContacts: true,
    
    // Financials
    canViewFinancials: true,
    canEditFinancials: false,
    canDeleteFinancials: false,
    
    // Roadmap
    canViewRoadmap: true,
    canEditRoadmap: true,
    canDeleteRoadmap: false,
    
    // Tasks
    canViewAllTasks: true,
    canEditAllTasks: true,
    canDeleteAllTasks: false,
    canAssignTasks: true,
    
    // Employees
    canViewEmployees: true,
    canEditEmployees: false,
    canDeleteEmployees: false
  },
  
  [ROLES.EMPLOYEE]: {
    // Company Management
    canEditCompanySettings: false,
    canDeleteCompany: false,
    canManageRoles: false,
    canInviteStaff: false,
    
    // CRM
    canViewCRM: true,
    canEditCRM: false,
    canDeleteCRM: false,
    canConvertContacts: false,
    
    // Financials
    canViewFinancials: true,
    canEditFinancials: false,
    canDeleteFinancials: false,
    
    // Roadmap
    canViewRoadmap: true,
    canEditRoadmap: false,
    canDeleteRoadmap: false,
    
    // Tasks
    canViewAllTasks: false,
    canEditAllTasks: false,
    canDeleteAllTasks: false,
    canAssignTasks: false,
    canViewOwnTasks: true,
    canEditOwnTasks: true,
    
    // Employees
    canViewEmployees: true,
    canEditEmployees: false,
    canDeleteEmployees: false
  }
};

/**
 * Check if a role has a specific permission
 * @param {string} role - The role to check
 * @param {string} permission - The permission to check
 * @returns {boolean}
 */
export function hasPermission(role, permission) {
  const permissions = ROLE_PERMISSIONS[role];
  if (!permissions) {
    return false;
  }
  return permissions[permission] === true;
}

/**
 * Check if role1 can manage role2 (based on hierarchy)
 * @param {string} role1 - The role trying to manage
 * @param {string} role2 - The role being managed
 * @returns {boolean}
 */
export function canManageRole(role1, role2) {
  const hierarchy1 = ROLE_HIERARCHY[role1] || 0;
  const hierarchy2 = ROLE_HIERARCHY[role2] || 0;
  return hierarchy1 > hierarchy2;
}

/**
 * Validate if a role is valid
 * @param {string} role - The role to validate
 * @returns {boolean}
 */
export function isValidRole(role) {
  return Object.values(ROLES).includes(role);
}

/**
 * Get all roles that a given role can assign
 * @param {string} role - The role trying to assign
 * @returns {string[]} - Array of roles that can be assigned
 */
export function getAssignableRoles(role) {
  const hierarchy = ROLE_HIERARCHY[role] || 0;
  return Object.entries(ROLE_HIERARCHY)
    .filter(([_, value]) => value < hierarchy)
    .map(([key, _]) => key);
}

/**
 * Get role display name
 * @param {string} role - The role
 * @returns {string} - Display name
 */
export function getRoleDisplayName(role) {
  const displayNames = {
    [ROLES.FOUNDER]: 'Founder',
    [ROLES.ADMIN]: 'Admin',
    [ROLES.MANAGER]: 'Manager',
    [ROLES.EMPLOYEE]: 'Employee'
  };
  return displayNames[role] || role;
}

