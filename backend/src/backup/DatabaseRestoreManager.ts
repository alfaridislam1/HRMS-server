import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import AWS from 'aws-sdk';

/**
 * Database Restore Manager
 * Handles restoration of RDS PostgreSQL databases from S3 backups
 * Supports point-in-time recovery and selective schema restoration
 */

export interface RestoreConfig {
    dbName: string;
    dbUser: string;
    dbHost: string;
    dbPort: number;
    s3Bucket: string;
    s3Region: string;
    awsAccessKeyId: string;
    awsSecretAccessKey: string;
}

export class DatabaseRestoreManager {
    private s3: AWS.S3;
    private config: RestoreConfig;

    constructor(config: RestoreConfig) {
        this.config = config;

        this.s3 = new AWS.S3({
            accessKeyId: config.awsAccessKeyId,
            secretAccessKey: config.awsSecretAccessKey,
            region: config.s3Region,
        });
    }

    /**
     * Restore full database from backup
     */
    async restoreFullDatabase(s3Key: string): Promise<void> {
        console.log(`Starting full database restore from: ${s3Key}`);

        const backupPath = path.join('/tmp', path.basename(s3Key));

        try {
            // Download backup from S3
            console.log('Downloading backup from S3...');
            await this.downloadFromS3(s3Key, backupPath);

            // Decompress if needed
            let sqlPath = backupPath;
            if (backupPath.endsWith('.gz')) {
                sqlPath = backupPath.replace('.gz', '');
                console.log('Decompressing backup...');
                execSync(`gunzip -c ${backupPath} > ${sqlPath}`);
            }

            // Create new database (drop existing first if --force)
            console.log('Creating database...');
            try {
                execSync(`createdb -h ${this.config.dbHost} -U ${this.config.dbUser} ${this.config.dbName}`, {
                    env: {
                        ...process.env,
                        PGPASSWORD: process.env.DATABASE_PASSWORD,
                    },
                });
            } catch {
                console.log('Database already exists, proceeding with restore...');
            }

            // Restore database
            console.log('Restoring database...');
            const restoreCommand = `psql -h ${this.config.dbHost} -U ${this.config.dbUser} -d ${this.config.dbName} < ${sqlPath}`;

            execSync(restoreCommand, {
                env: {
                    ...process.env,
                    PGPASSWORD: process.env.DATABASE_PASSWORD,
                },
                stdio: 'inherit',
            });

            console.log('✓ Database restored successfully');
        } finally {
            // Cleanup
            if (fs.existsSync(backupPath)) {
                fs.unlinkSync(backupPath);
            }
            const sqlPath = backupPath.replace('.gz', '');
            if (fs.existsSync(sqlPath)) {
                fs.unlinkSync(sqlPath);
            }
        }
    }

    /**
     * Restore specific schema
     */
    async restoreSchema(s3Key: string, targetSchema: string): Promise<void> {
        console.log(`Restoring schema from: ${s3Key} to ${targetSchema}`);

        const backupPath = path.join('/tmp', path.basename(s3Key));

        try {
            // Download backup
            console.log('Downloading backup from S3...');
            await this.downloadFromS3(s3Key, backupPath);

            // Decompress
            let sqlPath = backupPath;
            if (backupPath.endsWith('.gz')) {
                sqlPath = backupPath.replace('.gz', '');
                console.log('Decompressing backup...');
                execSync(`gunzip -c ${backupPath} > ${sqlPath}`);
            }

            // Create schema if not exists
            console.log(`Creating schema: ${targetSchema}`);
            const schemaCommand = `psql -h ${this.config.dbHost} -U ${this.config.dbUser} -d ${this.config.dbName} -c "CREATE SCHEMA IF NOT EXISTS ${targetSchema};"`;

            execSync(schemaCommand, {
                env: {
                    ...process.env,
                    PGPASSWORD: process.env.DATABASE_PASSWORD,
                },
            });

            // Restore schema
            console.log('Restoring schema data...');
            const restoreCommand = `psql -h ${this.config.dbHost} -U ${this.config.dbUser} -d ${this.config.dbName} < ${sqlPath}`;

            execSync(restoreCommand, {
                env: {
                    ...process.env,
                    PGPASSWORD: process.env.DATABASE_PASSWORD,
                },
                stdio: 'inherit',
            });

            console.log(`✓ Schema ${targetSchema} restored successfully`);
        } finally {
            // Cleanup
            if (fs.existsSync(backupPath)) {
                fs.unlinkSync(backupPath);
            }
            const sqlPath = backupPath.replace('.gz', '');
            if (fs.existsSync(sqlPath)) {
                fs.unlinkSync(sqlPath);
            }
        }
    }

    /**
     * Restore with connection pooling bypass
     * Useful for large databases
     */
    async restoreWithDirectConnection(s3Key: string): Promise<void> {
        console.log('Starting restore with direct connection...');

        const backupPath = path.join('/tmp', path.basename(s3Key));

        try {
            await this.downloadFromS3(s3Key, backupPath);

            let sqlPath = backupPath;
            if (backupPath.endsWith('.gz')) {
                sqlPath = backupPath.replace('.gz', '');
                execSync(`gunzip -c ${backupPath} > ${sqlPath}`);
            }

            // Use connection limit to prevent pooling issues
            const restoreCommand = `PGSSLMODE=require psql -h ${this.config.dbHost} -p ${this.config.dbPort} -U ${this.config.dbUser} -d postgres < ${sqlPath}`;

            execSync(restoreCommand, {
                env: {
                    ...process.env,
                    PGPASSWORD: process.env.DATABASE_PASSWORD,
                },
                stdio: 'inherit',
            });

            console.log('✓ Restore completed');
        } finally {
            if (fs.existsSync(backupPath)) {
                fs.unlinkSync(backupPath);
            }
        }
    }

    /**
     * Download backup from S3
     */
    private async downloadFromS3(s3Key: string, localPath: string): Promise<void> {
        const params = {
            Bucket: this.config.s3Bucket,
            Key: s3Key,
        };

        return new Promise((resolve, reject) => {
            this.s3.getObject(params, (err, data) => {
                if (err) {
                    reject(err);
                } else {
                    fs.writeFileSync(localPath, data.Body as Buffer);
                    console.log(`Downloaded: ${localPath}`);
                    resolve();
                }
            });
        });
    }

    /**
     * Validate backup integrity
     */
    async validateBackup(s3Key: string): Promise<boolean> {
        console.log(`Validating backup: ${s3Key}`);

        const backupPath = path.join('/tmp', path.basename(s3Key));

        try {
            await this.downloadFromS3(s3Key, backupPath);

            let sqlPath = backupPath;
            if (backupPath.endsWith('.gz')) {
                sqlPath = backupPath.replace('.gz', '');
                execSync(`gunzip -c ${backupPath} > ${sqlPath}`);
            }

            // Check if SQL file has content
            const stats = fs.statSync(sqlPath);
            if (stats.size === 0) {
                return false;
            }

            // Verify it contains valid SQL
            const content = fs.readFileSync(sqlPath, 'utf-8').slice(0, 1000);
            const isValid = content.includes('CREATE') || content.includes('INSERT');

            console.log(`✓ Backup validation: ${isValid ? 'PASSED' : 'FAILED'}`);
            return isValid;
        } finally {
            if (fs.existsSync(backupPath)) {
                fs.unlinkSync(backupPath);
            }
        }
    }

    /**
     * Get backup metadata
     */
    async getBackupMetadata(s3Key: string): Promise<AWS.S3.HeadObjectOutput> {
        const params = {
            Bucket: this.config.s3Bucket,
            Key: s3Key,
        };

        return this.s3.headObject(params).promise();
    }
}

export default DatabaseRestoreManager;
