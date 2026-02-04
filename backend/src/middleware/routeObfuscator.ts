import crypto from 'crypto';

export interface RouteMapping {
    obfuscatedPath: string;
    internalPath: string;
    method: string;
    requiredRole: string[];
    description?: string;
}

export interface RouteMappingConfig {
    [obfuscatedPath: string]: {
        internalPath: string;
        method: string;
        requiredRole: string[];
        description?: string;
    };
}

/**
 * Route Obfuscator - Maps external obfuscated URLs to internal readable endpoints
 * Keeps external API surface opaque while maintaining readable internal code
 */
export class RouteObfuscator {
    private mappings: Map<string, RouteMapping> = new Map();
    private reverseMappings: Map<string, RouteMapping> = new Map();
    private salt: string;

    constructor(salt?: string) {
        this.salt = salt || process.env.ROUTE_OBFUSCATION_SALT || 'hrms-secret-salt';
    }

    /**
     * Register a route mapping
     * Associates an obfuscated path with an internal path
     */
    registerRoute(obfuscatedPath: string, internalPath: string, config: {
        method: string;
        requiredRole: string[];
        description?: string;
    }): void {
        const mapping: RouteMapping = {
            obfuscatedPath,
            internalPath,
            ...config
        };

        this.mappings.set(obfuscatedPath, mapping);
        this.reverseMappings.set(internalPath, mapping);
    }

    /**
     * Register multiple routes at once from a configuration object
     */
    registerRoutes(config: RouteMappingConfig): void {
        Object.entries(config).forEach(([obfuscated, settings]) => {
            this.registerRoute(obfuscated, settings.internalPath, {
                method: settings.method,
                requiredRole: settings.requiredRole,
                description: settings.description
            });
        });
    }

    /**
     * Get internal path from obfuscated path
     */
    getInternalPath(obfuscatedPath: string): RouteMapping | undefined {
        return this.mappings.get(obfuscatedPath);
    }

    /**
     * Get obfuscated path from internal path (for generating external URLs)
     */
    getObfuscatedPath(internalPath: string): RouteMapping | undefined {
        return this.reverseMappings.get(internalPath);
    }

    /**
     * Generate a random obfuscated path
     * Useful for generating obfuscated URLs programmatically
     */
    generateObfuscatedPath(label?: string): string {
        const data = `${label || 'route'}-${Date.now()}-${Math.random()}`;
        return crypto.createHmac('sha256', this.salt)
            .update(data)
            .digest('hex')
            .substring(0, 32); // Keep it reasonably sized
    }

    /**
     * Get all registered mappings (for debugging/documentation)
     */
    getAllMappings(): RouteMapping[] {
        return Array.from(this.mappings.values());
    }
}

/**
 * Default HRMS route mappings
 * Maps obfuscated external paths to readable internal paths
 */
export const DEFAULT_ROUTE_MAPPINGS: RouteMappingConfig = {
    // Employee Routes
    '/yoiusalkasja/ausoiahs1896347ih2ewdkjags': {
        internalPath: '/api/employees',
        method: 'GET',
        requiredRole: ['hr', 'admin', 'manager'],
        description: 'List all employees'
    },
    '/ksoiausdhaksjhd/asukasiudhas13123123123': {
        internalPath: '/api/employees/:id',
        method: 'GET',
        requiredRole: ['hr', 'admin', 'manager'],
        description: 'Get employee details'
    },
    '/poiqweuoisajd/129312893jksahjkhd123123': {
        internalPath: '/api/employees',
        method: 'POST',
        requiredRole: ['hr', 'admin'],
        description: 'Create employee'
    },
    '/asjhdasd/asjhdalksjd12391283912839128': {
        internalPath: '/api/employees/:id',
        method: 'PUT',
        requiredRole: ['hr', 'admin'],
        description: 'Update employee'
    },
    '/qwueyiqwueyq/asjdhasjdhaksjdhaksjdh123': {
        internalPath: '/api/employees/:id',
        method: 'DELETE',
        requiredRole: ['hr', 'admin'],
        description: 'Delete employee'
    },

    // Leave Routes
    '/zxcvbnmasdf/1298934798239847298347239': {
        internalPath: '/api/leaves',
        method: 'GET',
        requiredRole: ['hr', 'admin', 'manager', 'employee'],
        description: 'List leaves'
    },
    '/tyuiopqwer/asdfghjklzxcvbnmasdfghjkl': {
        internalPath: '/api/leaves',
        method: 'POST',
        requiredRole: ['hr', 'admin', 'employee'],
        description: 'Request leave'
    },
    '/qwertyuiop/zxcvbnmasdfghjklqwertyui': {
        internalPath: '/api/leaves/:id/approve',
        method: 'POST',
        requiredRole: ['hr', 'admin', 'manager'],
        description: 'Approve leave'
    },
    '/dfghjklzxc/qwertyuiopasdfghjklzxcvbn': {
        internalPath: '/api/leave-balance/:employeeId',
        method: 'GET',
        requiredRole: ['hr', 'admin', 'manager', 'employee'],
        description: 'Get leave balance'
    },

    // Payroll Routes
    '/mnbvcxzasdf/sdfghjklmnbvcxzasdfghjkl': {
        internalPath: '/api/payroll',
        method: 'GET',
        requiredRole: ['hr', 'admin', 'manager'],
        description: 'List payroll'
    },
    '/hjklmnbvcx/zxcvbnmasdfghjklmnbvcxzas': {
        internalPath: '/api/payroll',
        method: 'POST',
        requiredRole: ['hr', 'admin'],
        description: 'Create payroll'
    },
    '/lkjhgfdsaz/xcvbnmasdfghjklmnbvcxzasd': {
        internalPath: '/api/payroll/:id/approve',
        method: 'POST',
        requiredRole: ['hr', 'admin'],
        description: 'Approve payroll'
    },

    // User Routes
    '/asdfghjklm/nbvcxzasdfghjklmnbvcxzasd': {
        internalPath: '/api/users',
        method: 'GET',
        requiredRole: ['admin'],
        description: 'List users'
    },
    '/wertyuiopq/wertyuiopasdfghjklzxcvbna': {
        internalPath: '/api/users/:id',
        method: 'GET',
        requiredRole: ['admin', 'self'],
        description: 'Get user profile'
    },
    '/sdfghjklpo/poiuytrewqasdfghjklmnbvc': {
        internalPath: '/api/users/:id',
        method: 'PUT',
        requiredRole: ['admin', 'self'],
        description: 'Update user'
    },

    // Department Routes
    '/uiopasdfgh/cvbnmasdfghjklmnbvcxzasdf': {
        internalPath: '/api/departments',
        method: 'GET',
        requiredRole: ['hr', 'admin', 'manager'],
        description: 'List departments'
    },
    '/ilopasdfgh/xcvbnmasdfghjklmnbvcxzas': {
        internalPath: '/api/departments/:id',
        method: 'GET',
        requiredRole: ['hr', 'admin', 'manager'],
        description: 'Get department'
    },
    '/qwertyasdf/sdfghjklmnbvcxzasdfghjklm': {
        internalPath: '/api/departments',
        method: 'POST',
        requiredRole: ['hr', 'admin'],
        description: 'Create department'
    },

    // Dashboard Routes
    '/poiuytgfds/sdfghjklmnbvcxzasdfghjkl': {
        internalPath: '/api/dashboard/executive',
        method: 'GET',
        requiredRole: ['admin', 'manager'],
        description: 'Executive dashboard'
    },
    '/lkjhgfdsal/lkjhgfdsaqwertyuiopzxcvbn': {
        internalPath: '/api/dashboard/employee/:id',
        method: 'GET',
        requiredRole: ['employee', 'admin', 'manager'],
        description: 'Employee dashboard'
    },

    // Approval Routes
    '/njkiuytrfg/xcvbnmasdfghjklmnbvcxzasd': {
        internalPath: '/api/approvals',
        method: 'GET',
        requiredRole: ['hr', 'admin', 'manager'],
        description: 'List pending approvals'
    },
    '/bvcxzasdfg/ghjklmnbvcxzasdfghjklmnbv': {
        internalPath: '/api/approvals/:id',
        method: 'GET',
        requiredRole: ['hr', 'admin', 'manager'],
        description: 'Get approval details'
    },
    '/cvbnmasdfg/hjklmnbvcxzasdfghjklmnbvc': {
        internalPath: '/api/approvals/:id/action',
        method: 'POST',
        requiredRole: ['hr', 'admin', 'manager'],
        description: 'Take approval action'
    }
};

/**
 * Create and configure default route obfuscator
 */
export function createRouteObfuscator(): RouteObfuscator {
    const obfuscator = new RouteObfuscator();
    obfuscator.registerRoutes(DEFAULT_ROUTE_MAPPINGS);
    return obfuscator;
}
