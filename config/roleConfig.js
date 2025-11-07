/**
 * Role Configuration for Company Staff
 * 
 * Defines all available roles for CompanyStaff
 * Similar to pipelineConfig.js - config-driven, enum-like values
 * Used for frontend dropdowns and backend validation
 */

export const roleConfig = {
  Founder: {
    label: "Founder",
    description: "Company founder with full access",
  },
  CFO: {
    label: "CFO",
    description: "Chief Financial Officer",
  },
  Sales: {
    label: "Sales",
    description: "Sales team member",
  },
  Marketing: {
    label: "Marketing",
    description: "Marketing team member",
  },
  'Community Manager': {
    label: "Community Manager",
    description: "Manages community and user engagement",
  },
};

/**
 * Get all role keys
 */
export const getRoles = () => Object.keys(roleConfig);

/**
 * Get config for a specific role
 */
export const getRoleConfig = (role) => {
  return roleConfig[role];
};

/**
 * Validate that a role is valid
 */
export const validateRole = (role) => {
  if (!roleConfig[role]) {
    throw new Error(`Invalid role: ${role}. Allowed: ${getRoles().join(", ")}`);
  }
  return true;
};

