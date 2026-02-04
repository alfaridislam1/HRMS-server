import { Knex } from 'knex';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Migration Runner
 * Executes database migrations with rollback support
 * Supports both Knex migrations and custom migration files
 */

export interface MigrationOptions {
    directory?: string;
    extension?: string;
    loadExtensions?: string[];
    namespace?: string;
    timestampFormat?: string;
}

export class MigrationRunner {
    constructor(
        private knex: Knex,
        private options: MigrationOptions = {},
    ) {
        this.options = {
            directory: './src/database/migrations',
            extension: 'ts',
            loadExtensions: ['.ts', '.js'],
            timestampFormat: 'YYYY-MM-DDTHH:mm:ss',
            ...options,
        };
    }

    /**
     * Run latest migrations
     */
    async up(): Promise<void> {
        console.log('Running migrations...');
        try {
            const [batchNo, migrations] = await this.knex.migrate.latest({
                directory: this.options.directory,
                extension: this.options.extension,
                loadExtensions: this.options.loadExtensions,
            });

            if (migrations.length === 0) {
                console.log('✓ No new migrations to run');
            } else {
                console.log(`✓ Executed ${migrations.length} migrations`);
                migrations.forEach((m) => console.log(`  - ${m}`));
            }
        } catch (error) {
            console.error('✗ Migration failed:', error);
            throw error;
        }
    }

    /**
     * Rollback migrations
     */
    async down(steps = 1): Promise<void> {
        console.log(`Rolling back ${steps} migration(s)...`);
        try {
            const [batchNo, migrations] = await this.knex.migrate.rollback(
                {
                    directory: this.options.directory,
                    extension: this.options.extension,
                },
                steps,
            );

            if (migrations.length === 0) {
                console.log('✓ No migrations to rollback');
            } else {
                console.log(`✓ Rolled back ${migrations.length} migrations`);
                migrations.forEach((m) => console.log(`  - ${m}`));
            }
        } catch (error) {
            console.error('✗ Rollback failed:', error);
            throw error;
        }
    }

    /**
     * Get migration status
     */
    async status(): Promise<void> {
        try {
            const migrations = await this.knex.migrate.list({
                directory: this.options.directory,
                extension: this.options.extension,
            });

            console.log('\nMigration Status:');
            console.log('================');

            const [completed, pending] = migrations;

            if (completed.length > 0) {
                console.log('\n✓ Completed migrations:');
                completed.forEach((m) => console.log(`  - ${m}`));
            }

            if (pending.length > 0) {
                console.log('\n✗ Pending migrations:');
                pending.forEach((m) => console.log(`  - ${m}`));
            } else {
                console.log('\n✓ All migrations completed');
            }
        } catch (error) {
            console.error('✗ Failed to get status:', error);
            throw error;
        }
    }

    /**
     * Run tenant-specific migrations
     * Each tenant schema gets its own migrations
     */
    async runTenantMigrations(schemaName: string): Promise<void> {
        console.log(`Running migrations for schema: ${schemaName}`);

        try {
            // Set search_path for this migration session
            await this.knex.raw(`SET search_path TO "${schemaName}", public;`);

            const [batchNo, migrations] = await this.knex.migrate.latest({
                directory: this.options.directory,
                extension: this.options.extension,
            });

            console.log(`✓ Executed ${migrations.length} migrations for ${schemaName}`);
        } catch (error) {
            console.error(`✗ Tenant migration failed for ${schemaName}:`, error);
            throw error;
        }
    }

    /**
     * Create a new migration file
     */
    async createMigration(name: string): Promise<string> {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('-').slice(0, 3).join('-');
        const filename = `${timestamp}_${name}.ts`;
        const filepath = path.join(this.options.directory || './migrations', filename);

        const template = `import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // TODO: Implement migration
}

export async function down(knex: Knex): Promise<void> {
  // TODO: Implement rollback
}
`;

        // Ensure directory exists
        const dir = path.dirname(filepath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        fs.writeFileSync(filepath, template);
        console.log(`✓ Created migration: ${filename}`);

        return filepath;
    }

    /**
     * Get latest completed migration
     */
    async getLatestMigration(): Promise<string | null> {
        try {
            const migrations = await this.knex.migrate.list({
                directory: this.options.directory,
            });

            const [completed] = migrations;
            return completed.length > 0 ? completed[completed.length - 1] : null;
        } catch {
            return null;
        }
    }

    /**
     * Force mark migration as complete (use with caution)
     */
    async markMigrationAsComplete(migrationName: string): Promise<void> {
        console.warn('⚠ Force marking migration as complete - use with caution!');

        await this.knex('knex_migrations').insert({
            name: migrationName,
            batch: (await this.knex('knex_migrations').max('batch as max').first()).max + 1 || 1,
            migration_time: new Date(),
        });

        console.log(`✓ Marked ${migrationName} as complete`);
    }
}

export default MigrationRunner;
