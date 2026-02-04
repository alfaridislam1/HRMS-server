import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
    // Create tenants management table in public schema
    await knex.schema.createTable('tenants', (table) => {
        table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
        table.string('name').notNullable().unique();
        table.string('slug').notNullable().unique();
        table.string('database_schema').notNullable().unique();
        table.text('description').nullable();
        table.enum('status', ['active', 'suspended', 'inactive']).defaultTo('active');
        table.json('settings').defaultTo('{}');
        table.string('admin_email').notNullable();
        table.timestamp('created_at').defaultTo(knex.fn.now());
        table.timestamp('updated_at').defaultTo(knex.fn.now());
        table.timestamp('deleted_at').nullable();

        table.index('slug');
        table.index('status');
    });

    // Create tenant_features table for feature flags per tenant
    await knex.schema.createTable('tenant_features', (table) => {
        table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
        table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
        table.string('feature_name').notNullable();
        table.boolean('enabled').defaultTo(true);
        table.json('config').defaultTo('{}');
        table.timestamp('created_at').defaultTo(knex.fn.now());
        table.timestamp('updated_at').defaultTo(knex.fn.now());

        table.unique(['tenant_id', 'feature_name']);
        table.index('tenant_id');
    });

    // Create tenant_audit table for tracking tenant changes
    await knex.schema.createTable('tenant_audit', (table) => {
        table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
        table.uuid('tenant_id').notNullable().references('id').inTable('tenants');
        table.string('action').notNullable(); // 'created', 'updated', 'deleted'
        table.json('changes').defaultTo('{}');
        table.string('changed_by').nullable();
        table.timestamp('created_at').defaultTo(knex.fn.now());

        table.index('tenant_id');
        table.index('created_at');
    });
}

export async function down(knex: Knex): Promise<void> {
    await knex.schema.dropTableIfExists('tenant_audit');
    await knex.schema.dropTableIfExists('tenant_features');
    await knex.schema.dropTableIfExists('tenants');
}
