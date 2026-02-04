import RedisCacheManager from './RedisCacheManager';

/**
 * Organization Cache Manager
 * Handles caching of organizational structure data
 * Keys: org:{tenantId}:departments, org:{tenantId}:designations, etc.
 */

export class OrganizationCacheManager {
    constructor(private cache: RedisCacheManager) { }

    private getCacheKey(tenantId: string, entity: string, id?: string): string {
        if (id) {
            return `org:${tenantId}:${entity}:${id}`;
        }
        return `org:${tenantId}:${entity}`;
    }

    // ========== DEPARTMENTS ==========

    /**
     * Cache all departments for a tenant
     */
    async cacheDepartments(tenantId: string, departments: any[], ttl = 3600): Promise<void> {
        await this.cache.set(this.getCacheKey(tenantId, 'departments'), departments, ttl);
    }

    /**
     * Get departments from cache
     */
    async getDepartments(tenantId: string): Promise<any[] | null> {
        return this.cache.get(this.getCacheKey(tenantId, 'departments'));
    }

    /**
     * Cache a single department
     */
    async cacheDepartment(tenantId: string, departmentId: string, department: any, ttl = 3600): Promise<void> {
        await this.cache.set(this.getCacheKey(tenantId, 'departments', departmentId), department, ttl);
    }

    /**
     * Get single department from cache
     */
    async getDepartment(tenantId: string, departmentId: string): Promise<any | null> {
        return this.cache.get(this.getCacheKey(tenantId, 'departments', departmentId));
    }

    /**
     * Invalidate department cache
     */
    async invalidateDepartments(tenantId: string): Promise<void> {
        await this.cache.deletePattern(`org:${tenantId}:departments*`);
    }

    // ========== DESIGNATIONS ==========

    /**
     * Cache all designations for a tenant
     */
    async cacheDesignations(tenantId: string, designations: any[], ttl = 3600): Promise<void> {
        await this.cache.set(this.getCacheKey(tenantId, 'designations'), designations, ttl);
    }

    /**
     * Get designations from cache
     */
    async getDesignations(tenantId: string): Promise<any[] | null> {
        return this.cache.get(this.getCacheKey(tenantId, 'designations'));
    }

    /**
     * Invalidate designation cache
     */
    async invalidateDesignations(tenantId: string): Promise<void> {
        await this.cache.deletePattern(`org:${tenantId}:designations*`);
    }

    // ========== ORGANIZATIONAL HIERARCHY ==========

    /**
     * Cache org hierarchy tree
     */
    async cacheOrgHierarchy(tenantId: string, hierarchy: any, ttl = 3600): Promise<void> {
        await this.cache.set(`org:${tenantId}:hierarchy`, hierarchy, ttl);
    }

    /**
     * Get org hierarchy from cache
     */
    async getOrgHierarchy(tenantId: string): Promise<any | null> {
        return this.cache.get(`org:${tenantId}:hierarchy`);
    }

    /**
     * Invalidate org hierarchy cache
     */
    async invalidateOrgHierarchy(tenantId: string): Promise<void> {
        await this.cache.delete(`org:${tenantId}:hierarchy`);
    }
}

export default OrganizationCacheManager;
