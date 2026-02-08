import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<any> {
    // Enable uuid-ossp or pgcrypto for UUID generation
    await knex.raw('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');

    // Create public schema tables

    await knex.schema.withSchema('public').createTable('tenants', (table) => {

        table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
        table.string('name', 255).notNullable();
        table.string('slug', 100).unique().notNullable();
        table.string('schema_name', 100).unique().notNullable();
        table.enum('subscription_plan', ['starter', 'professional', 'enterprise']).defaultTo('starter');
        table.enum('subscription_status', ['active', 'trial', 'suspended', 'cancelled']).defaultTo('trial');
        table.timestamp('trial_ends_at');
        table.string('billing_email', 255);
        table.timestamps(true, true);
    });

    await knex.schema.withSchema('public').createTable('users', (table) => {

        table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
        table.string('email', 255).unique().notNullable();
        table.string('password_hash', 255);
        table.string('full_name', 255);
        table.enum('auth_method', ['email', 'oauth']).defaultTo('email');
        table.string('oauth_provider', 50);
        table.string('oauth_id', 255);
        table.enum('status', ['active', 'inactive', 'pending_invitation']).defaultTo('pending_invitation');
        table.boolean('email_verified').defaultTo(false);
        table.timestamp('email_verified_at');
        table.boolean('mfa_enabled').defaultTo(false);
        table.timestamp('last_login');
        table.string('last_ip_address', 45);
        table.timestamps(true, true);
        table.index(['email']);
        table.index(['oauth_provider', 'oauth_id']);
    });

    await knex.schema.withSchema('public').createTable('roles', (table) => {

        table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
        table.uuid('tenant_id').references('tenants.id').onDelete('CASCADE');
        table.uuid('user_id').references('users.id').onDelete('CASCADE');
        table.string('code', 50).notNullable();
        table.string('name', 100).notNullable();
        table.text('description');
        table.timestamps(true, true);
        table.unique(['tenant_id', 'user_id', 'code']);
    });

    // Create tenant schema (example for tenant_001)
    await knex.raw('CREATE SCHEMA IF NOT EXISTS tenant_001');

    // Create tables in tenant schema
    await knex.schema.withSchema('tenant_001').createTable('departments', (table) => {
        table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
        table.string('name', 100).notNullable();
        table.string('code', 50);
        table.uuid('parent_department_id').references('id').onDelete('SET NULL');
        table.string('budget', 20);
        table.timestamps(true, true);
    });

    await knex.schema.withSchema('tenant_001').createTable('employees', (table) => {
        table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
        table.string('employee_id', 50).unique().notNullable();
        table.string('first_name', 100).notNullable();
        table.string('last_name', 100).notNullable();
        table.string('email_company', 255).unique().notNullable();
        table.string('email_personal', 255);
        table.string('phone_company', 20);
        table.string('phone_personal', 20);
        table.date('date_of_birth');
        table.string('job_title', 100);
        table.uuid('department_id').references('departments.id');
        table.uuid('manager_id').references('id').onDelete('SET NULL');
        table.enum('employment_type', ['full_time', 'part_time', 'contract', 'intern']).notNullable();
        table.enum('employment_status', ['active', 'on_leave', 'suspended', 'terminated']).defaultTo('active');
        table.date('start_date').notNullable();
        table.date('end_date');
        table.string('work_location', 100);
        table.timestamps(true, true);
        table.timestamp('deleted_at');
        table.uuid('created_by');
        table.uuid('updated_by');
        table.index(['employment_status']);
        table.index(['deleted_at']);
    });

    await knex.schema.withSchema('tenant_001').createTable('leave_types', (table) => {
        table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
        table.string('name', 100).notNullable();
        table.string('code', 20);
        table.integer('annual_entitlement').notNullable();
        table.boolean('paid').defaultTo(true);
        table.text('description');
        table.boolean('requires_approval').defaultTo(true);
        table.string('country_code', 2);
        table.timestamps(true, true);
    });

    await knex.schema.withSchema('tenant_001').createTable('leave_requests', (table) => {
        table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
        table.uuid('employee_id').references('employees.id').onDelete('CASCADE').notNullable();
        table.uuid('leave_type_id').references('leave_types.id').onDelete('CASCADE').notNullable();
        table.date('start_date').notNullable();
        table.date('end_date').notNullable();
        table.integer('duration_days');
        table.text('reason');
        table.enum('status', ['draft', 'submitted', 'approved', 'rejected', 'cancelled']).defaultTo('draft');
        table.uuid('approved_by');
        table.text('approval_comment');
        table.timestamp('approved_at');
        table.timestamps(true, true);
        table.index(['employee_id', 'status']);
        table.index(['start_date', 'end_date']);
    });

    await knex.schema.withSchema('tenant_001').createTable('attendance', (table) => {
        table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
        table.uuid('employee_id').references('employees.id').onDelete('CASCADE').notNullable();
        table.date('attendance_date').notNullable();
        table.time('check_in_time');
        table.time('check_out_time');
        table.decimal('work_hours_scheduled', 5, 2);
        table.decimal('work_hours_actual', 5, 2);
        table.enum('status', ['present', 'absent', 'late', 'on_leave', 'holiday', 'sick']).defaultTo('present');
        table.string('location', 100);
        table.text('notes');
        table.timestamps(true, true);
        table.unique(['employee_id', 'attendance_date']);
        table.index(['employee_id', 'attendance_date']);
    });

    await knex.schema.withSchema('tenant_001').createTable('payroll_periods', (table) => {
        table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
        table.string('period_name', 50).notNullable();
        table.date('start_date').notNullable();
        table.date('end_date').notNullable();
        table.date('salary_due_date');
        table.enum('status', ['draft', 'locked', 'processed', 'paid']).defaultTo('draft');
        table.integer('total_employees').defaultTo(0);
        table.decimal('total_salary', 15, 2).defaultTo(0);
        table.timestamps(true, true);
        table.unique(['start_date', 'end_date']);
    });

    await knex.schema.withSchema('tenant_001').createTable('salary_slips', (table) => {
        table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
        table.uuid('employee_id').references('employees.id').onDelete('CASCADE').notNullable();
        table.uuid('payroll_period_id').references('payroll_periods.id').onDelete('CASCADE').notNullable();
        table.decimal('base_salary', 12, 2);
        table.decimal('allowances', 12, 2).defaultTo(0);
        table.decimal('deductions', 12, 2).defaultTo(0);
        table.decimal('net_salary', 12, 2);
        table.enum('paid_status', ['pending', 'paid', 'failed']).defaultTo('pending');
        table.timestamp('paid_at');
        table.string('payment_reference', 100);
        table.timestamps(true, true);
        table.unique(['employee_id', 'payroll_period_id']);
        table.index(['payroll_period_id']);
    });

    await knex.schema.withSchema('tenant_001').createTable('audit_log', (table) => {
        table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
        table.string('action', 100).notNullable();
        table.string('resource_type', 50).notNullable();
        table.uuid('resource_id');
        table.string('resource_name', 255);
        table.jsonb('old_values');
        table.jsonb('new_values');
        table.uuid('performed_by');
        table.string('ip_address', 45);
        table.timestamps(true, true);
        table.index(['resource_type', 'resource_id']);
        table.index(['created_at']);
    });
}

export async function down(knex: Knex): Promise<any> {
    // Drop tenant schema (all tables cascade)
    await knex.raw('DROP SCHEMA IF EXISTS tenant_001 CASCADE');

    // Drop public schema tables
    await knex.schema.dropTableIfExists('public.roles');
    await knex.schema.dropTableIfExists('public.users');
    await knex.schema.dropTableIfExists('public.tenants');
}
