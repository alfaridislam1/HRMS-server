import RedisCacheManager from './RedisCacheManager';

/**
 * Permissions Cache Manager
 * Handles role-based access control (RBAC) caching
 * Keys: perms:{tenantId}:user:{userId}, perms:{tenantId}:role:{roleName}
 */

export class PermissionsCacheManager {
    constructor(private cache: RedisCacheManager) { }

    // ========== USER PERMISSIONS ==========

    /**
     * Cache user permissions
     */
    async cacheUserPermissions(
        tenantId: string,
        userId: string,
        permissions: string[],
        ttl = 1800, // 30 minutes
    ): Promise<void> {
        const key = `perms:${tenantId}:user:${userId}`;
        await this.cache.set(key, permissions, ttl);
    }

    /**
     * Get user permissions from cache
     */
    async getUserPermissions(tenantId: string, userId: string): Promise<string[] | null> {
        const key = `perms:${tenantId}:user:${userId}`;
        return this.cache.get<string[]>(key);
    }

    /**
     * Check if user has permission
     */
    async hasPermission(tenantId: string, userId: string, permission: string): Promise<boolean | null> {
        const permissions = await this.getUserPermissions(tenantId, userId);
        if (!permissions) return null; // Not cached
        return permissions.includes(permission);
    }

    /**
     * Invalidate user permissions cache
     */
    async invalidateUserPermissions(tenantId: string, userId: string): Promise<void> {
        const key = `perms:${tenantId}:user:${userId}`;
        await this.cache.delete(key);
    }

    // ========== ROLE PERMISSIONS ==========

    /**
     * Cache role permissions
     */
    async cacheRolePermissions(
        tenantId: string,
        roleName: string,
        permissions: string[],
        ttl = 3600,
    ): Promise<void> {
        const key = `perms:${tenantId}:role:${roleName}`;
        await this.cache.set(key, permissions, ttl);
    }

    /**
     * Get role permissions from cache
     */
    async getRolePermissions(tenantId: string, roleName: string): Promise<string[] | null> {
        const key = `perms:${tenantId}:role:${roleName}`;
        return this.cache.get<string[]>(key);
    }

    /**
     * Invalidate role permissions cache
     */
    async invalidateRolePermissions(tenantId: string, roleName: string): Promise<void> {
        const key = `perms:${tenantId}:role:${roleName}`;
        await this.cache.delete(key);
    }

    /**
     * Invalidate all permissions for a tenant
     */
    async invalidateTenantPermissions(tenantId: string): Promise<void> {
        await this.cache.deletePattern(`perms:${tenantId}:*`);
    }

    // ========== RESOURCE ACCESS ==========

    /**
     * Cache resource access permissions
     * Useful for checking if user can access specific document or record
     */
    async cacheResourceAccess(
        tenantId: string,
        userId: string,
        resourceType: string,
        allowedResourceIds: string[],
        ttl = 1800,
    ): Promise<void> {
        const key = `perms:${tenantId}:user:${userId}:resources:${resourceType}`;
        await this.cache.set(key, allowedResourceIds, ttl);
    }

    /**
     * Check resource access
     */
    async canAccessResource(
        tenantId: string,
        userId: string,
        resourceType: string,
        resourceId: string,
    ): Promise<boolean | null> {
        const key = `perms:${tenantId}:user:${userId}:resources:${resourceType}`;
        const resources = await this.cache.get<string[]>(key);
        if (!resources) return null;
        return resources.includes(resourceId);
    }

    /**
     * Invalidate resource access cache for user
     */
    async invalidateResourceAccess(tenantId: string, userId: string): Promise<void> {
        await this.cache.deletePattern(`perms:${tenantId}:user:${userId}:resources:*`);
    }
}

export default PermissionsCacheManager;
