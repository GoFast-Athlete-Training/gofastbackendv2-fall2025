/**
 * Repository Configuration
 * 
 * Defines all GoFast repositories for roadmap item tracking.
 * Used for Primary Repo dropdown in roadmap items.
 */

export const repoConfig = {
  "MVP1": {
    label: "MVP1",
    description: "Main repo - gofastfrontend-mvp1",
    value: "MVP1",
    repoName: "gofastfrontend-mvp1"
  },
  "GoFast-demo": {
    label: "GoFast-demo",
    description: "Demo/prototype repo - gofastfrontend-demo",
    value: "GoFast-demo",
    repoName: "gofastfrontend-demo"
  },
  "GoFastBackend": {
    label: "GoFastBackend",
    description: "Backend repo - gofastbackendv2-fall2025",
    value: "GoFastBackend",
    repoName: "gofastbackendv2-fall2025"
  },
  "GoFastEvents": {
    label: "GoFastEvents",
    description: "Events repo - GoFast-Events",
    value: "GoFastEvents",
    repoName: "GoFast-Events"
  },
  "GoFast-Dashboard": {
    label: "GoFast-Dashboard",
    description: "User dashboard repo - gofast-user-dashboard",
    value: "GoFast-Dashboard",
    repoName: "gofast-user-dashboard"
  },
  "GoFast Company": {
    label: "GoFast Company",
    description: "Company stack repo - gofast-companystack",
    value: "GoFast Company",
    repoName: "gofast-companystack"
  }
};

/**
 * Get all repo keys
 */
export const getRepos = () => Object.keys(repoConfig);

/**
 * Get repo config by value
 */
export const getRepoConfig = (value) => {
  return repoConfig[value] || null;
};

/**
 * Get repo label by value
 */
export const getRepoLabel = (value) => {
  const config = repoConfig[value];
  return config ? config.label : value;
};

/**
 * Get repo description by value
 */
export const getRepoDescription = (value) => {
  const config = repoConfig[value];
  return config ? config.description : null;
};

/**
 * Get repo name (actual GitHub repo name) by value
 */
export const getRepoName = (value) => {
  const config = repoConfig[value];
  return config ? config.repoName : value;
};

/**
 * Validate repo value
 */
export const validateRepo = (value) => {
  if (!repoConfig[value]) {
    throw new Error(`Invalid repo: ${value}. Allowed: ${getRepos().join(", ")}`);
  }
  return true;
};

