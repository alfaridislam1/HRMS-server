import { Knex } from 'knex';

/**
 * Creates initial tenant schema tables
 * Each tenant has their own schema for data isolation
 */
export async function up(knex: Knex): Promise<void> {
    // Get tenant schema from environment or parameter
    const schema = process.env.TENANT_SCHEMA || 'tenant_default';

    await knex.schema.createSchemaIfNotExists(schema);

    // ========== USERS & AUTHENTICATION ==========
    await knex.schema.withSchema(schema).createTable('users', (table) => {
        table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
        table.string('email').notNullable().unique();
        table.string('password_hash').notNullable();
        table.string('first_name').notNullable();
        table.string('last_name').notNullable();
        table.enum('role', ['admin', 'manager', 'employee', 'hr']).defaultTo('employee');
        table.boolean('is_active').defaultTo(true);
        table.timestamp('last_login').nullable();
        table.timestamp('created_at').defaultTo(knex.fn.now());
        table.timestamp('updated_at').defaultTo(knex.fn.now());
        table.timestamp('deleted_at').nullable();

        table.index('email');
        table.index('role');
        table.index('is_active');
    });

    // ========== ORGANIZATIONAL STRUCTURE ==========
    await knex.schema.withSchema(schema).createTable('departments', (table) => {
        table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
        table.string('name').notNullable();
        table.string('code').notNullable().unique();
        table.text('description').nullable();
        table.uuid('parent_department_id').nullable().references('id').inTable(`${schema}.departments`);
        table.uuid('manager_id').nullable().references('id').inTable(`${schema}.users`);
        table.enum('status', ['active', 'inactive']).defaultTo('active');
        table.timestamp('created_at').defaultTo(knex.fn.now());
        table.timestamp('updated_at').defaultTo(knex.fn.now());

        table.index('code');
        table.index('status');
        table.index('parent_department_id');
    });

    await knex.schema.withSchema(schema).createTable('designations', (table) => {
        table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
        table.string('name').notNullable().unique();
        table.string('code').notNullable().unique();
        table.text('description').nullable();
        table.integer('seniority_level').defaultTo(0);
        table.enum('status', ['active', 'inactive']).defaultTo('active');
        table.timestamp('created_at').defaultTo(knex.fn.now());
        table.timestamp('updated_at').defaultTo(knex.fn.now());

        table.index('code');
    });

    // ========== EMPLOYEES ==========
    await knex.schema.withSchema(schema).createTable('employees', (table) => {
        table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
        table.uuid('user_id').notNullable().unique().references('id').inTable(`${schema}.users`);
        table.string('employee_code').notNullable().unique();
        table.string('email').notNullable();
        table.string('phone').nullable();
        table.date('date_of_birth').nullable();
        table.enum('gender', ['M', 'F', 'Other']).nullable();
        table.string('nationality').nullable();
        table.text('address').nullable();
        table.string('city').nullable();
        table.string('state').nullable();
        table.string('postal_code').nullable();
        table.string('country').nullable();

        // Employment Details
        table.uuid('department_id').notNullable().references('id').inTable(`${schema}.departments`);
        table.uuid('designation_id').notNullable().references('id').inTable(`${schema}.designations`);
        table.uuid('manager_id').nullable().references('id').inTable(`${schema}.employees`);
        table.enum('employment_type', ['full-time', 'part-time', 'contract', 'intern']).defaultTo('full-time');
        table.date('date_of_joining').notNullable();
        table.date('date_of_exit').nullable();

        // Documents & Verification
        table.string('pan').nullable();
        table.string('aadhaar').nullable();
        table.string('bank_account').nullable();
        table.string('ifsc_code').nullable();

        // Status
        table.enum('status', ['active', 'inactive', 'on_leave', 'suspended']).defaultTo('active');
        table.timestamp('created_at').defaultTo(knex.fn.now());
        table.timestamp('updated_at').defaultTo(knex.fn.now());
        table.timestamp('deleted_at').nullable();

        table.index('employee_code');
        table.index('email');
        table.index('department_id');
        table.index('designation_id');
        table.index('manager_id');
        table.index('status');
    });

    // ========== SALARY & PAYROLL ==========
    await knex.schema.withSchema(schema).createTable('salary_structures', (table) => {
        table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
        table.uuid('designation_id').notNullable().references('id').inTable(`${schema}.designations`);
        table.string('name').notNullable();
        table.decimal('base_salary', 15, 2).notNullable();
        table.json('allowances').defaultTo('{}'); // HRA, DA, etc.
        table.json('deductions').defaultTo('{}'); // PF, IT, etc.
        table.decimal('gross_salary', 15, 2).notNullable();
        table.enum('status', ['active', 'inactive']).defaultTo('active');
        table.timestamp('effective_from').notNullable();
        table.timestamp('effective_to').nullable();
        table.timestamp('created_at').defaultTo(knex.fn.now());
        table.timestamp('updated_at').defaultTo(knex.fn.now());

        table.index('designation_id');
    });

    await knex.schema.withSchema(schema).createTable('employee_salaries', (table) => {
        table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
        table.uuid('employee_id').notNullable().references('id').inTable(`${schema}.employees`).onDelete('CASCADE');
        table.uuid('salary_structure_id').notNullable().references('id').inTable(`${schema}.salary_structures`);
        table.date('effective_from').notNullable();
        table.date('effective_to').nullable();
        table.decimal('base_salary', 15, 2).notNullable();
        table.json('allowances').defaultTo('{}');
        table.json('deductions').defaultTo('{}');
        table.decimal('gross_salary', 15, 2).notNullable();
        table.enum('status', ['active', 'inactive']).defaultTo('active');
        table.timestamp('created_at').defaultTo(knex.fn.now());
        table.timestamp('updated_at').defaultTo(knex.fn.now());

        table.index('employee_id');
        table.index('effective_from');
    });

    await knex.schema.withSchema(schema).createTable('payroll', (table) => {
        table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
        table.uuid('employee_id').notNullable().references('id').inTable(`${schema}.employees`).onDelete('CASCADE');
        table.string('month').notNullable(); // YYYY-MM format
        table.integer('days_worked').notNullable();
        table.integer('days_absent').defaultTo(0);
        table.integer('days_leave_taken').defaultTo(0);
        table.decimal('gross_salary', 15, 2).notNullable();
        table.json('allowances').defaultTo('{}');
        table.json('deductions').defaultTo('{}');
        table.decimal('net_salary', 15, 2).notNullable();
        table.enum('status', ['draft', 'approved', 'processed', 'paid']).defaultTo('draft');
        table.timestamp('approved_at').nullable();
        table.uuid('approved_by').nullable().references('id').inTable(`${schema}.users`);
        table.timestamp('payment_date').nullable();
        table.string('payment_reference').nullable();
        table.timestamp('created_at').defaultTo(knex.fn.now());
        table.timestamp('updated_at').defaultTo(knex.fn.now());

        table.unique(['employee_id', 'month']);
        table.index('month');
        table.index('status');
    });

    // ========== LEAVE MANAGEMENT ==========
    await knex.schema.withSchema(schema).createTable('leave_types', (table) => {
        table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
        table.string('name').notNullable().unique();
        table.string('code').notNullable().unique();
        table.text('description').nullable();
        table.integer('max_days_per_year').notNullable();
        table.boolean('is_paid').defaultTo(true);
        table.boolean('requires_approval').defaultTo(true);
        table.enum('status', ['active', 'inactive']).defaultTo('active');
        table.timestamp('created_at').defaultTo(knex.fn.now());
        table.timestamp('updated_at').defaultTo(knex.fn.now());

        table.index('code');
    });

    await knex.schema.withSchema(schema).createTable('employee_leave_balance', (table) => {
        table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
        table.uuid('employee_id').notNullable().references('id').inTable(`${schema}.employees`).onDelete('CASCADE');
        table.uuid('leave_type_id').notNullable().references('id').inTable(`${schema}.leave_types`);
        table.integer('year').notNullable();
        table.decimal('opening_balance', 10, 2).notNullable();
        table.decimal('leaves_taken', 10, 2).defaultTo(0);
        table.decimal('leaves_approved', 10, 2).defaultTo(0);
        table.decimal('leaves_pending', 10, 2).defaultTo(0);
        table.decimal('closing_balance', 10, 2).notNullable();
        table.timestamp('created_at').defaultTo(knex.fn.now());
        table.timestamp('updated_at').defaultTo(knex.fn.now());

        table.unique(['employee_id', 'leave_type_id', 'year']);
        table.index('employee_id');
    });

    await knex.schema.withSchema(schema).createTable('leaves', (table) => {
        table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
        table.uuid('employee_id').notNullable().references('id').inTable(`${schema}.employees`).onDelete('CASCADE');
        table.uuid('leave_type_id').notNullable().references('id').inTable(`${schema}.leave_types`);
        table.date('start_date').notNullable();
        table.date('end_date').notNullable();
        table.integer('number_of_days').notNullable();
        table.text('reason').notNullable();
        table.enum('status', ['pending', 'approved', 'rejected', 'cancelled']).defaultTo('pending');
        table.uuid('approved_by').nullable().references('id').inTable(`${schema}.users`);
        table.timestamp('approved_at').nullable();
        table.text('approval_comments').nullable();
        table.timestamp('created_at').defaultTo(knex.fn.now());
        table.timestamp('updated_at').defaultTo(knex.fn.now());

        table.index('employee_id');
        table.index('status');
        table.index('start_date');
    });

    // ========== APPROVALS & WORKFLOWS ==========
    await knex.schema.withSchema(schema).createTable('approval_workflows', (table) => {
        table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
        table.string('name').notNullable();
        table.enum('entity_type', ['leave', 'payroll', 'expense', 'salary_change']).notNullable();
        table.json('approval_chain').notNullable(); // Array of step configs
        table.enum('status', ['active', 'inactive']).defaultTo('active');
        table.timestamp('created_at').defaultTo(knex.fn.now());
        table.timestamp('updated_at').defaultTo(knex.fn.now());

        table.index('entity_type');
    });

    await knex.schema.withSchema(schema).createTable('approvals', (table) => {
        table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
        table.uuid('workflow_id').notNullable().references('id').inTable(`${schema}.approval_workflows`);
        table.string('entity_type').notNullable();
        table.uuid('entity_id').notNullable();
        table.integer('current_step').defaultTo(1);
        table.uuid('assigned_to').notNullable().references('id').inTable(`${schema}.users`);
        table.enum('status', ['pending', 'approved', 'rejected']).defaultTo('pending');
        table.text('comments').nullable();
        table.timestamp('actioned_at').nullable();
        table.timestamp('created_at').defaultTo(knex.fn.now());
        table.timestamp('updated_at').defaultTo(knex.fn.now());

        table.index('entity_type');
        table.index('entity_id');
        table.index('status');
    });

    // ========== AUDIT LOGGING ==========
    await knex.schema.withSchema(schema).createTable('audit_logs', (table) => {
        table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
        table.uuid('user_id').nullable().references('id').inTable(`${schema}.users`);
        table.string('action').notNullable(); // 'create', 'update', 'delete', etc.
        table.string('entity_type').notNullable();
        table.uuid('entity_id').notNullable();
        table.json('changes').defaultTo('{}');
        table.string('ip_address').nullable();
        table.string('user_agent').nullable();
        table.timestamp('created_at').defaultTo(knex.fn.now());

        table.index('entity_type');
        table.index('entity_id');
        table.index('user_id');
        table.index('created_at');
    });

    // ========== SETTINGS & CONFIGURATIONS ==========
    await knex.schema.withSchema(schema).createTable('organization_settings', (table) => {
        table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
        table.string('key').notNullable().unique();
        table.text('value').nullable();
        table.enum('data_type', ['string', 'number', 'boolean', 'json']).defaultTo('string');
        table.text('description').nullable();
        table.timestamp('created_at').defaultTo(knex.fn.now());
        table.timestamp('updated_at').defaultTo(knex.fn.now());

        table.index('key');
    });
}

export async function down(knex: Knex): Promise<void> {
    const schema = process.env.TENANT_SCHEMA || 'tenant_default';

    await knex.schema.withSchema(schema).dropTableIfExists('organization_settings');
    await knex.schema.withSchema(schema).dropTableIfExists('audit_logs');
    await knex.schema.withSchema(schema).dropTableIfExists('approvals');
    await knex.schema.withSchema(schema).dropTableIfExists('approval_workflows');
    await knex.schema.withSchema(schema).dropTableIfExists('leaves');
    await knex.schema.withSchema(schema).dropTableIfExists('employee_leave_balance');
    await knex.schema.withSchema(schema).dropTableIfExists('leave_types');
    await knex.schema.withSchema(schema).dropTableIfExists('payroll');
    await knex.schema.withSchema(schema).dropTableIfExists('employee_salaries');
    await knex.schema.withSchema(schema).dropTableIfExists('salary_structures');
    await knex.schema.withSchema(schema).dropTableIfExists('employees');
    await knex.schema.withSchema(schema).dropTableIfExists('designations');
    await knex.schema.withSchema(schema).dropTableIfExists('departments');
    await knex.schema.withSchema(schema).dropTableIfExists('users');

    await knex.schema.dropSchemaIfExists(schema);
}
