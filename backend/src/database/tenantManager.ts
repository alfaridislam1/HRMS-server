/**
 * Multi-Tenancy Manager - Handles tenant isolation with per-schema strategy
 * Each tenant gets their own PostgreSQL schema for complete data isolation
 */

import { Knex } from 'knex';
import { v4 as uuidv4 } from 'uuid';

interface TenantConfig {
    name: string;
    slug: string;
    adminEmail: string;
    description?: string;
    settings?: Record<string, any>;
}

export class TenantManager {
    constructor(private knex: Knex) { }

    /**
     * Create a new tenant with dedicated schema
     */
    async createTenant(config: TenantConfig): Promise<{ tenantId: string; schemaName: string }> {
        const tenantId = uuidv4();
        const schemaName = `tenant_${config.slug}_${tenantId.slice(0, 8)}`;

        try {
            // 1. Create schema
            await this.knex.raw(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`);

            // 2. Insert tenant record in public schema
            await this.knex('tenants').insert({
                id: tenantId,
                name: config.name,
                slug: config.slug,
                database_schema: schemaName,
                description: config.description,
                admin_email: config.adminEmail,
                settings: JSON.stringify(config.settings || {}),
                status: 'active',
            });

            // 3. Run migrations for this tenant schema
            await this.runTenantMigrations(schemaName, tenantId);

            console.log(`✓ Tenant created: ${config.name} (${tenantId}) in schema: ${schemaName}`);
            return { tenantId, schemaName };
        } catch (error) {
            // Cleanup on failure
            await this.knex.raw(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`).catch(() => { });
            throw error;
        }
    }

    /**
     * Run tenant-specific migrations
     */
    private async runTenantMigrations(schemaName: string, tenantId: string): Promise<void> {
        // Create users table in tenant schema
        await this.knex.schema.withSchema(schemaName).createTable('users', (table) => {
            table.uuid('id').primary().defaultTo(this.knex.raw('gen_random_uuid()'));
            table.string('email').notNullable().unique();
            table.string('password_hash').notNullable();
            table.string('first_name').notNullable();
            table.string('last_name').notNullable();
            table.enum('role', ['admin', 'manager', 'employee', 'hr']).defaultTo('employee');
            table.boolean('is_active').defaultTo(true);
            table.timestamp('last_login').nullable();
            table.timestamp('created_at').defaultTo(this.knex.fn.now());
            table.timestamp('updated_at').defaultTo(this.knex.fn.now());

            table.index('email');
            table.index('role');
        });

        // Set search_path for the schema
        await this.knex.raw(`ALTER ROLE CURRENT_USER SET search_path TO "${schemaName}", public;`);
    }

    /**
     * Get tenant configuration by ID
     */
    async getTenant(tenantId: string): Promise<any> {
        return this.knex('tenants').where('id', tenantId).first();
    }

    /**
     * Get tenant by slug
     */
    async getTenantBySlug(slug: string): Promise<any> {
        return this.knex('tenants').where('slug', slug).first();
    }

    /**
     * List all active tenants
     */
    async listTenants(status = 'active'): Promise<any[]> {
        return this.knex('tenants').where('status', status);
    }

    /**
     * Delete tenant and its schema
     */
    async deleteTenant(tenantId: string): Promise<void> {
        const tenant = await this.getTenant(tenantId);
        if (!tenant) throw new Error('Tenant not found');

        const schemaName = tenant.database_schema;

        // Soft delete first
        await this.knex('tenants').where('id', tenantId).update({
            status: 'inactive',
            deleted_at: new Date(),
        });

        // Hard delete schema after backup
        // In production, backup should be done before this
        await this.knex.raw(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`);

        console.log(`✓ Tenant deleted: ${tenantId} (schema: ${schemaName})`);
    }

    /**
     * Get schema name for tenant
     */
    async getSchemaName(tenantId: string): Promise<string> {
        const tenant = await this.getTenant(tenantId);
        if (!tenant) throw new Error(`Tenant not found: ${tenantId}`);
        return tenant.database_schema;
    }

    /**
     * Enable/Disable features per tenant
     */
    async setFeature(
        tenantId: string,
        featureName: string,
        enabled: boolean,
        config?: Record<string, any>,
    ): Promise<void> {
        await this.knex('tenant_features')
            .insert({
                id: uuidv4(),
                tenant_id: tenantId,
                feature_name: featureName,
                enabled,
                config: JSON.stringify(config || {}),
            })
            .onConflict(['tenant_id', 'feature_name'])
            .merge({ enabled, config: JSON.stringify(config || {}) });
    }

    /**
     * Check if feature is enabled for tenant
     */
    async isFeatureEnabled(tenantId: string, featureName: string): Promise<boolean> {
        const feature = await this.knex('tenant_features')
            .where('tenant_id', tenantId)
            .where('feature_name', featureName)
            .first();

        return feature?.enabled ?? false;
    }

    /**
     * Get feature config
     */
    async getFeatureConfig(tenantId: string, featureName: string): Promise<Record<string, any>> {
        const feature = await this.knex('tenant_features')
            .where('tenant_id', tenantId)
            .where('feature_name', featureName)
            .first();

        return feature?.config || {};
    }

    /**
     * Add audit log entry
     */
    async logTenantAction(
        tenantId: string,
        action: string,
        changes: Record<string, any>,
        changedBy?: string,
    ): Promise<void> {
        await this.knex('tenant_audit').insert({
            id: uuidv4(),
            tenant_id: tenantId,
            action,
            changes: JSON.stringify(changes),
            changed_by: changedBy,
        });
    }
}

export default TenantManager;
