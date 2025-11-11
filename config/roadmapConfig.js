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
 * P0 = Must have (critical, blocking)
 * P1 = Should have (important, growth driver)
 * P2 = Nice to have (enhancement, polish)
 */
export const priorityConfig = {
  P0: {
    label: "P0 - Critical",
    description: "Must have (critical, blocking)",
    value: "P0",
    color: "red",
    order: 0
  },
  P1: {
    label: "P1 - Important",
    description: "Should have (important, growth driver)",
    value: "P1",
    color: "orange",
    order: 1
  },
  P2: {
    label: "P2 - Nice to Have",
    description: "Nice to have (enhancement, polish)",
    value: "P2",
    color: "blue",
    order: 2
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
 * Roadmap Types
 * Defines the type of roadmap (Product, GTM, Operations, etc.)
 */
export const roadmapTypeConfig = {
  Product: {
    label: "Product",
    description: "Product features and functionality",
    value: "Product"
  },
  GTM: {
    label: "GTM",
    description: "Go-to-market strategy and execution",
    value: "GTM"
  },
  Operations: {
    label: "Operations",
    description: "Operational improvements and processes",
    value: "Operations"
  },
  Infrastructure: {
    label: "Infrastructure",
    description: "Infrastructure and technical foundation",
    value: "Infrastructure"
  },
  "UX/Design": {
    label: "UX/Design",
    description: "User experience and design improvements",
    value: "UX/Design"
  }
};

/**
 * Item Types
 * Defines whether it's a Feature or Milestone
 */
export const itemTypeConfig = {
  Feature: {
    label: "Feature",
    description: "A product feature or functionality",
    value: "Feature"
  },
  Milestone: {
    label: "Milestone",
    description: "A significant milestone or achievement",
    value: "Milestone"
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
 * Visual Display Options
 * How the roadmap item should be displayed
 */
export const visualConfig = {
  List: {
    label: "List",
    description: "Display as a list item",
    value: "List"
  },
  Timeline: {
    label: "Timeline",
    description: "Display on a timeline view",
    value: "Timeline"
  },
  Kanban: {
    label: "Kanban",
    description: "Display on a kanban board",
    value: "Kanban"
  }
};

/**
 * Parent Architecture Options
 * Groups related features (e.g., "RunCrew", "Profile", "Messaging")
 * This is a free-form field but we can suggest common values
 */
export const parentArchitectureSuggestions = [
  "RunCrew",
  "Profile",
  "Messaging",
  "Leaderboard",
  "Training",
  "Events",
  "Settings",
  "Authentication",
  "Admin"
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
 * Get all roadmap type keys
 */
export const getRoadmapTypes = () => Object.keys(roadmapTypeConfig);

/**
 * Get all item type keys
 */
export const getItemTypes = () => Object.keys(itemTypeConfig);

/**
 * Get all category keys
 */
export const getCategories = () => Object.keys(categoryConfig);

/**
 * Get all visual keys
 */
export const getVisuals = () => Object.keys(visualConfig);

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
 * Validate roadmap type
 */
export const validateRoadmapType = (roadmapType) => {
  if (!roadmapTypeConfig[roadmapType]) {
    throw new Error(`Invalid roadmap type: ${roadmapType}. Allowed: ${getRoadmapTypes().join(", ")}`);
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
 * Validate visual
 */
export const validateVisual = (visual) => {
  if (!visualConfig[visual]) {
    throw new Error(`Invalid visual: ${visual}. Allowed: ${getVisuals().join(", ")}`);
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
 * Get config for a specific roadmap type
 */
export const getRoadmapTypeConfig = (roadmapType) => {
  return roadmapTypeConfig[roadmapType];
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

/**
 * Get config for a specific visual
 */
export const getVisualConfig = (visual) => {
  return visualConfig[visual];
};

