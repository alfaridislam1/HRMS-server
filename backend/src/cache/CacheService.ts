import RedisCacheManager from './RedisCacheManager';
import OrganizationCacheManager from './OrganizationCacheManager';
import PermissionsCacheManager from './PermissionsCacheManager';
import DashboardCacheManager from './DashboardCacheManager';

/**
 * Cache Service Factory
 * Provides unified access to all cache managers
 */

export class CacheService {
    private static instance: CacheService;
    private redisCache: RedisCacheManager;
    private organizationCache: OrganizationCacheManager;
    private permissionsCache: PermissionsCacheManager;
    private dashboardCache: DashboardCacheManager;

    private constructor() {
        this.redisCache = new RedisCacheManager();
        this.organizationCache = new OrganizationCacheManager(this.redisCache);
        this.permissionsCache = new PermissionsCacheManager(this.redisCache);
        this.dashboardCache = new DashboardCacheManager(this.redisCache);
    }

    /**
     * Get singleton instance
     */
    static getInstance(): CacheService {
        if (!CacheService.instance) {
            CacheService.instance = new CacheService();
        }
        return CacheService.instance;
    }

    // Getters for all cache managers
    getRedisCache(): RedisCacheManager {
        return this.redisCache;
    }

    getOrganizationCache(): OrganizationCacheManager {
        return this.organizationCache;
    }

    getPermissionsCache(): PermissionsCacheManager {
        return this.permissionsCache;
    }

    getDashboardCache(): DashboardCacheManager {
        return this.dashboardCache;
    }

    /**
     * Health check
     */
    async healthCheck(): Promise<boolean> {
        try {
            const client = this.redisCache.getClient();
            await client.ping();
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Disconnect all
     */
    async disconnect(): Promise<void> {
        await this.redisCache.disconnect();
    }
}

export default CacheService;
