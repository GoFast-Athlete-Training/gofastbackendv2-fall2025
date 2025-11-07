// RunCrew Manager Map Service
// Maps RunCrewManager relationships to queryable format for frontend

import { RUNCREW_ROLES } from '../config/runCrewRoleConfig.js';

/**
 * Check if an athlete is an admin of a RunCrew
 * @param {Object} runCrew - RunCrew object with managers array
 * @param {string} athleteId - Athlete ID to check
 * @returns {boolean}
 */
export const isAthleteAdmin = (runCrew, athleteId) => {
  if (!runCrew || !athleteId) return false;
  
  // Check RunCrewManager model (queryable!)
  if (runCrew.managers && Array.isArray(runCrew.managers)) {
    return runCrew.managers.some(
      manager => manager.athleteId === athleteId && manager.role === RUNCREW_ROLES.ADMIN
    );
  }
  
  // Fallback: Check runcrewAdminId field (backward compatibility)
  if (runCrew.runcrewAdminId === athleteId) {
    return true;
  }
  
  return false;
};

/**
 * Check if an athlete is a manager (admin or manager role) of a RunCrew
 * @param {Object} runCrew - RunCrew object with managers array
 * @param {string} athleteId - Athlete ID to check
 * @returns {boolean}
 */
export const isAthleteManager = (runCrew, athleteId) => {
  if (!runCrew || !athleteId) return false;
  
  // Check RunCrewManager model (queryable!)
  if (runCrew.managers && Array.isArray(runCrew.managers)) {
    return runCrew.managers.some(
      manager => manager.athleteId === athleteId && 
        (manager.role === RUNCREW_ROLES.ADMIN || manager.role === RUNCREW_ROLES.MANAGER)
    );
  }
  
  // Fallback: Check runcrewAdminId field (backward compatibility)
  if (runCrew.runcrewAdminId === athleteId) {
    return true;
  }
  
  return false;
};

/**
 * Get the role of an athlete in a RunCrew
 * @param {Object} runCrew - RunCrew object with managers array
 * @param {string} athleteId - Athlete ID to check
 * @returns {string|null} - Role string or null if not a manager
 */
export const getAthleteRole = (runCrew, athleteId) => {
  if (!runCrew || !athleteId) return null;
  
  // Check RunCrewManager model (queryable!)
  if (runCrew.managers && Array.isArray(runCrew.managers)) {
    const manager = runCrew.managers.find(m => m.athleteId === athleteId);
    if (manager) {
      return manager.role;
    }
  }
  
  // Fallback: Check runcrewAdminId field (backward compatibility)
  if (runCrew.runcrewAdminId === athleteId) {
    return RUNCREW_ROLES.ADMIN;
  }
  
  return null;
};

/**
 * Get all managers for a RunCrew (formatted for frontend)
 * @param {Object} runCrew - RunCrew object with managers array
 * @returns {Array} - Array of manager objects with athlete info
 */
export const getManagers = (runCrew) => {
  if (!runCrew || !runCrew.managers || !Array.isArray(runCrew.managers)) {
    return [];
  }
  
  return runCrew.managers.map(manager => ({
    id: manager.id,
    role: manager.role,
    athleteId: manager.athleteId,
    athlete: manager.athlete || null,
    createdAt: manager.createdAt
  }));
};

/**
 * Get all admins for a RunCrew
 * @param {Object} runCrew - RunCrew object with managers array
 * @returns {Array} - Array of admin manager objects
 */
export const getAdmins = (runCrew) => {
  if (!runCrew || !runCrew.managers || !Array.isArray(runCrew.managers)) {
    return [];
  }
  
  return runCrew.managers.filter(m => m.role === RUNCREW_ROLES.ADMIN);
};

/**
 * Get all managers (non-admin) for a RunCrew
 * @param {Object} runCrew - RunCrew object with managers array
 * @returns {Array} - Array of manager (non-admin) objects
 */
export const getManagersOnly = (runCrew) => {
  if (!runCrew || !runCrew.managers || !Array.isArray(runCrew.managers)) {
    return [];
  }
  
  return runCrew.managers.filter(m => m.role === RUNCREW_ROLES.MANAGER);
};

