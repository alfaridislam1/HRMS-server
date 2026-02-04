import RedisCacheManager from './RedisCacheManager';

/**
 * Dashboard Cache Manager
 * Handles caching of dashboard data and analytics
 * Helps reduce database load for frequently viewed metrics
 */

export interface DashboardMetrics {
    totalEmployees: number;
    activeEmployees: number;
    onLeaveCount: number;
    newJoinersThisMonth: number;
    departmentDistribution: Record<string, number>;
    leavesApprovedThisMonth: number;
    leavesPendingApproval: number;
    payrollStatus: {
        processed: number;
        pending: number;
        failed: number;
    };
    appraisalsInProgress: number;
    appraisalsCompleted: number;
    lastUpdated: Date;
}

export class DashboardCacheManager {
    constructor(private cache: RedisCacheManager) { }

    // ========== EXECUTIVE DASHBOARD ==========

    /**
     * Cache executive dashboard metrics
     */
    async cacheExecutiveDashboard(
        tenantId: string,
        metrics: DashboardMetrics,
        ttl = 900, // 15 minutes
    ): Promise<void> {
        const key = `dashboard:${tenantId}:executive`;
        await this.cache.set(key, metrics, ttl);
    }

    /**
     * Get executive dashboard from cache
     */
    async getExecutiveDashboard(tenantId: string): Promise<DashboardMetrics | null> {
        const key = `dashboard:${tenantId}:executive`;
        return this.cache.get<DashboardMetrics>(key);
    }

    /**
     * Invalidate executive dashboard cache
     */
    async invalidateExecutiveDashboard(tenantId: string): Promise<void> {
        const key = `dashboard:${tenantId}:executive`;
        await this.cache.delete(key);
    }

  // ========== EMPLOYEE DASHBOARD ==========

  export interface EmployeeDashboard {
    myLeaveBalance: Record<string, number>;
    upcomingLeaves: Array<{ startDate: Date; endDate: Date; type: string }>;
    pendingApprovals: number;
    appraisalStatus: string;
    salaryDetails: {
        baseSalary: number;
        netSalary: number;
        lastPaymentDate: Date;
    };
    recentDocuments: Array<{ name: string; uploadedAt: Date }>;
}

  /**
   * Cache employee dashboard
   */
  async cacheEmployeeDashboard(
    tenantId: string,
    employeeId: string,
    dashboard: EmployeeDashboard,
    ttl = 600, // 10 minutes
): Promise < void> {
    const key = `dashboard:${tenantId}:employee:${employeeId}`;
    await this.cache.set(key, dashboard, ttl);
}

  /**
   * Get employee dashboard from cache
   */
  async getEmployeeDashboard(tenantId: string, employeeId: string): Promise < EmployeeDashboard | null > {
    const key = `dashboard:${tenantId}:employee:${employeeId}`;
    return this.cache.get<EmployeeDashboard>(key);
}

  /**
   * Invalidate employee dashboard
   */
  async invalidateEmployeeDashboard(tenantId: string, employeeId: string): Promise < void> {
    const key = `dashboard:${tenantId}:employee:${employeeId}`;
    await this.cache.delete(key);
}

// ========== LEAVE STATISTICS ==========

export interface LeaveStats {
    totalLeaves: number;
    approvedLeaves: number;
    pendingLeaves: number;
    rejectedLeaves: number;
    utilizationRate: number;
    topLeaveType: string;
}

  /**
   * Cache leave statistics
   */
  async cacheLeaveStats(
    tenantId: string,
    stats: LeaveStats,
    ttl = 1800, // 30 minutes
): Promise < void> {
    const key = `stats:${tenantId}:leaves`;
    await this.cache.set(key, stats, ttl);
}

  /**
   * Get leave statistics from cache
   */
  async getLeaveStats(tenantId: string): Promise < LeaveStats | null > {
    const key = `stats:${tenantId}:leaves`;
    return this.cache.get<LeaveStats>(key);
}

// ========== PAYROLL STATISTICS ==========

export interface PayrollStats {
    totalProcessed: number;
    totalAmount: number;
    averageSalary: number;
    maxSalary: number;
    minSalary: number;
    processedCount: number;
    pendingCount: number;
}

  /**
   * Cache payroll statistics
   */
  async cachePayrollStats(
    tenantId: string,
    month: string,
    stats: PayrollStats,
    ttl = 1800,
): Promise < void> {
    const key = `stats:${tenantId}:payroll:${month}`;
    await this.cache.set(key, stats, ttl);
}

  /**
   * Get payroll statistics from cache
   */
  async getPayrollStats(tenantId: string, month: string): Promise < PayrollStats | null > {
    const key = `stats:${tenantId}:payroll:${month}`;
    return this.cache.get<PayrollStats>(key);
}

  /**
   * Invalidate all payroll stats for tenant
   */
  async invalidatePayrollStats(tenantId: string): Promise < void> {
    await this.cache.deletePattern(`stats:${tenantId}:payroll:*`);
}

  // ========== GENERAL CACHE INVALIDATION ==========

  /**
   * Invalidate all dashboard caches for a tenant
   * Call this after major data changes
   */
  async invalidateAllDashboards(tenantId: string): Promise < void> {
    await this.cache.deletePattern(`dashboard:${tenantId}:*`);
    await this.cache.deletePattern(`stats:${tenantId}:*`);
}
}

export default DashboardCacheManager;
