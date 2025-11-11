/**
 * Roadmap Configuration - Config-Driven Roadmap System
 * 
 * Defines all roadmap field options and their meanings.
 * Used for frontend dropdowns, backend validation, and field mapping.
 * 
 * Based on PRODUCT_ROADMAP.md and CompanyRoadmapItem schema
 */

/**
 * Priority Levels
 * Critical Path = Must have (critical, blocking)
 * Enhanced User Feature = Should have (important, growth driver)
 * Future Release = Nice to have (enhancement, polish)
 * Revenue Builder = Revenue-generating feature
 */
export const priorityConfig = {
  "Critical Path": {
    label: "Critical Path",
    description: "Must have (critical, blocking)",
    value: "Critical Path",
    color: "red",
    order: 0
  },
  "Enhanced User Feature": {
    label: "Enhanced User Feature",
    description: "Should have (important, growth driver)",
    value: "Enhanced User Feature",
    color: "orange",
    order: 1
  },
  "Future Release": {
    label: "Future Release",
    description: "Nice to have (enhancement, polish)",
    value: "Future Release",
    color: "blue",
    order: 2
  },
  "Revenue Builder": {
    label: "Revenue Builder",
    description: "Revenue-generating feature",
    value: "Revenue Builder",
    color: "green",
    order: 3
  }
};

/**
 * Status Options
 */
export const statusConfig = {
  "Not Started": {
    label: "Not Started",
    description: "Feature has not been started",
    value: "Not Started",
    color: "gray",
    order: 0
  },
  "In Progress": {
    label: "In Progress",
    description: "Feature is currently being worked on",
    value: "In Progress",
    color: "yellow",
    order: 1
  },
  "Done": {
    label: "Done",
    description: "Feature is completed",
    value: "Done",
    color: "green",
    order: 2
  }
};

/**
 * Item Types
 * Defines whether it's Dev Work or Product Milestone
 */
export const itemTypeConfig = {
  "Dev Work": {
    label: "Dev Work",
    description: "Development work item",
    value: "Dev Work"
  },
  "Product Milestone": {
    label: "Product Milestone",
    description: "A significant product milestone (e.g., 'Get on GooglePlay')",
    value: "Product Milestone"
  }
};

/**
 * Categories
 * Defines the category of work (Core Feature, Frontend, Backend, API, etc.)
 * Note: "User Testing" and "Release" are workflow stages, not categories
 */
export const categoryConfig = {
  "Core Feature": {
    label: "Core Feature",
    description: "Core product feature",
    value: "Core Feature"
  },
  "Frontend Demo": {
    label: "Frontend Demo",
    description: "Frontend prototype or demo",
    value: "Frontend Demo"
  },
  "API Integration": {
    label: "API Integration",
    description: "API integration work",
    value: "API Integration"
  },
  "Backend Scaffolding": {
    label: "Backend Scaffolding",
    description: "Backend infrastructure and scaffolding",
    value: "Backend Scaffolding"
  }
};


/**
 * Primary Repo Suggestions
 * Primary repository where this work lives (e.g., "mvp1", "eventslanding", "companystack")
 * This is a free-form field but we can suggest common values
 */
export const primaryRepoSuggestions = [
  "mvp1",
  "eventslanding",
  "companystack",
  "user-dashboard",
  "backend"
];

/**
 * Get all priority keys
 */
export const getPriorities = () => Object.keys(priorityConfig);

/**
 * Get all status keys
 */
export const getStatuses = () => Object.keys(statusConfig);


/**
 * Get all item type keys
 */
export const getItemTypes = () => Object.keys(itemTypeConfig);

/**
 * Get all category keys
 */
export const getCategories = () => Object.keys(categoryConfig);


/**
 * Validate priority
 */
export const validatePriority = (priority) => {
  if (!priorityConfig[priority]) {
    throw new Error(`Invalid priority: ${priority}. Allowed: ${getPriorities().join(", ")}`);
  }
  return true;
};

/**
 * Validate status
 */
export const validateStatus = (status) => {
  if (!statusConfig[status]) {
    throw new Error(`Invalid status: ${status}. Allowed: ${getStatuses().join(", ")}`);
  }
  return true;
};


/**
 * Validate item type
 */
export const validateItemType = (itemType) => {
  if (!itemTypeConfig[itemType]) {
    throw new Error(`Invalid item type: ${itemType}. Allowed: ${getItemTypes().join(", ")}`);
  }
  return true;
};

/**
 * Validate category
 */
export const validateCategory = (category) => {
  if (!categoryConfig[category]) {
    throw new Error(`Invalid category: ${category}. Allowed: ${getCategories().join(", ")}`);
  }
  return true;
};


/**
 * Get config for a specific priority
 */
export const getPriorityConfig = (priority) => {
  return priorityConfig[priority];
};

/**
 * Get config for a specific status
 */
export const getStatusConfig = (status) => {
  return statusConfig[status];
};


/**
 * Get config for a specific item type
 */
export const getItemTypeConfig = (itemType) => {
  return itemTypeConfig[itemType];
};

/**
 * Get config for a specific category
 */
export const getCategoryConfig = (category) => {
  return categoryConfig[category];
};


