/**
 * Maintenance mode configuration and utilities
 */

export interface MaintenanceConfig {
  isEnabled: boolean;
  message?: string;
  estimatedCompletion?: string;
  allowedPaths?: string[];
}

export interface MaintenanceResponse {
  isEnabled: boolean;
  message?: string;
  estimatedCompletion?: string;
}

/**
 * Fetch maintenance mode status from server
 */
export async function fetchMaintenanceStatus(): Promise<MaintenanceResponse> {
  try {
    const response = await fetch('/api/maintenance', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch maintenance status');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching maintenance status:', error);
    // Return default values if fetch fails
    return {
      isEnabled: false,
      message: "We're currently performing scheduled maintenance to improve your gaming experience.",
      estimatedCompletion: "Soon™",
    };
  }
}

/**
 * Get maintenance configuration (async version that fetches from server)
 */
export async function getMaintenanceConfig(): Promise<MaintenanceConfig> {
  const serverConfig = await fetchMaintenanceStatus();
  
  return {
    isEnabled: serverConfig.isEnabled,
    message: serverConfig.message || 
             "We're currently performing scheduled maintenance to improve your gaming experience.",
    estimatedCompletion: serverConfig.estimatedCompletion || "Soon™",
    allowedPaths: [
      '/maintenance',
      '/api/maintenance', // Allow maintenance API
      '/api/health', // Allow health checks
      '/_next', // Allow Next.js assets
      '/favicon.ico',
      '/assets', // Allow static assets
    ]
  };
}

/**
 * Synchronous version for middleware (uses fallback)
 * For middleware, you might want to use a different approach or cache the result
 */
export function getMaintenanceConfigSync(): MaintenanceConfig {
  return {
    isEnabled: false, // Default to false for sync version
    message: "We're currently performing scheduled maintenance to improve your gaming experience.",
    estimatedCompletion: "Soon™",
    allowedPaths: [
      '/maintenance',
      '/api/maintenance',
      '/api/health',
      '/_next',
      '/favicon.ico',
      '/assets',
    ]
  };
}

/**
 * Check if a path should be accessible during maintenance (async version)
 */
export async function isPathAllowed(pathname: string): Promise<boolean> {
  const config = await getMaintenanceConfig();
  
  if (!config.isEnabled) {
    return true;
  }

  return config.allowedPaths?.some((allowedPath: string) => 
    pathname.startsWith(allowedPath)
  ) ?? false;
}

/**
 * Synchronous version for middleware - uses sync config
 */
export function isPathAllowedSync(pathname: string): boolean {
  const config = getMaintenanceConfigSync();
  
  if (!config.isEnabled) {
    return true;
  }

  return config.allowedPaths?.some((allowedPath: string) => 
    pathname.startsWith(allowedPath)
  ) ?? false;
}

/**
 * Get the maintenance page URL
 */
export function getMaintenancePageUrl(): string {
  return '/maintenance';
}
