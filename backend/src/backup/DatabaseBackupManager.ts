import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import AWS from 'aws-sdk';
import { Knex } from 'knex';

/**
 * Database Backup Manager
 * Handles RDS PostgreSQL backups to S3
 * Supports full and incremental backups
 */

export interface BackupConfig {
    dbName: string;
    dbUser: string;
    dbHost: string;
    dbPort: number;
    s3Bucket: string;
    s3Region: string;
    awsAccessKeyId: string;
    awsSecretAccessKey: string;
    retentionDays?: number; // Days to keep backups
}

export class DatabaseBackupManager {
    private s3: AWS.S3;
    private config: BackupConfig;

    constructor(config: BackupConfig) {
        this.config = {
            retentionDays: 30,
            ...config,
        };

        this.s3 = new AWS.S3({
            accessKeyId: config.awsAccessKeyId,
            secretAccessKey: config.awsSecretAccessKey,
            region: config.s3Region,
        });
    }

    /**
     * Create full database backup
     * Uses pg_dump to create a complete backup file
     */
    async createFullBackup(tenantId?: string): Promise<{ filename: string; s3Key: string }> {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupFilename = tenantId
            ? `backup_tenant_${tenantId}_${timestamp}.sql.gz`
            : `backup_full_${timestamp}.sql.gz`;

        const backupPath = path.join('/tmp', backupFilename);

        try {
            console.log(`Creating backup: ${backupFilename}`);

            // Create backup using pg_dump
            const dumpCommand = `pg_dump -h ${this.config.dbHost} -p ${this.config.dbPort} -U ${this.config.dbUser} -d ${this.config.dbName} | gzip > ${backupPath}`;

            execSync(dumpCommand, {
                env: {
                    ...process.env,
                    PGPASSWORD: process.env.DATABASE_PASSWORD,
                },
                stdio: 'inherit',
            });

            // Upload to S3
            const s3Key = `backups/${new Date().getFullYear()}/${new Date().getMonth() + 1}/${backupFilename}`;
            await this.uploadToS3(backupPath, s3Key);

            // Clean up local file
            fs.unlinkSync(backupPath);

            console.log(`✓ Backup created and uploaded to S3: ${s3Key}`);
            return { filename: backupFilename, s3Key };
        } catch (error) {
            // Clean up on error
            if (fs.existsSync(backupPath)) {
                fs.unlinkSync(backupPath);
            }
            throw error;
        }
    }

    /**
     * Create schema-specific backup
     */
    async createSchemaBackup(schemaName: string): Promise<{ filename: string; s3Key: string }> {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupFilename = `backup_schema_${schemaName}_${timestamp}.sql.gz`;
        const backupPath = path.join('/tmp', backupFilename);

        try {
            console.log(`Creating schema backup: ${backupFilename}`);

            const dumpCommand = `pg_dump -h ${this.config.dbHost} -p ${this.config.dbPort} -U ${this.config.dbUser} -d ${this.config.dbName} -n "${schemaName}" | gzip > ${backupPath}`;

            execSync(dumpCommand, {
                env: {
                    ...process.env,
                    PGPASSWORD: process.env.DATABASE_PASSWORD,
                },
                stdio: 'inherit',
            });

            const s3Key = `backups/schemas/${schemaName}/${backupFilename}`;
            await this.uploadToS3(backupPath, s3Key);

            fs.unlinkSync(backupPath);

            console.log(`✓ Schema backup created: ${s3Key}`);
            return { filename: backupFilename, s3Key };
        } catch (error) {
            if (fs.existsSync(backupPath)) {
                fs.unlinkSync(backupPath);
            }
            throw error;
        }
    }

    /**
     * Upload backup file to S3
     */
    private async uploadToS3(filePath: string, s3Key: string): Promise<void> {
        const fileStream = fs.createReadStream(filePath);
        const fileSize = fs.statSync(filePath).size;

        const params: AWS.S3.PutObjectRequest = {
            Bucket: this.config.s3Bucket,
            Key: s3Key,
            Body: fileStream,
            ContentType: 'application/gzip',
            Metadata: {
                'created-at': new Date().toISOString(),
                'backup-type': 'database',
            },
        };

        return new Promise((resolve, reject) => {
            this.s3.upload(params, (err, data) => {
                if (err) reject(err);
                else {
                    console.log(`Uploaded to S3: ${data.Location} (${fileSize} bytes)`);
                    resolve();
                }
            });
        });
    }

    /**
     * List backups in S3
     */
    async listBackups(prefix = 'backups/'): Promise<AWS.S3.ObjectList> {
        const params = {
            Bucket: this.config.s3Bucket,
            Prefix: prefix,
        };

        const data = await this.s3.listObjects(params).promise();
        return data.Contents || [];
    }

    /**
     * Delete old backups based on retention policy
     */
    async cleanupOldBackups(): Promise<void> {
        const retentionMs = (this.config.retentionDays || 30) * 24 * 60 * 60 * 1000;
        const cutoffDate = new Date(Date.now() - retentionMs);

        const backups = await this.listBackups();

        for (const backup of backups) {
            if (backup.LastModified && backup.LastModified < cutoffDate) {
                console.log(`Deleting old backup: ${backup.Key}`);
                await this.s3
                    .deleteObject({
                        Bucket: this.config.s3Bucket,
                        Key: backup.Key,
                    })
                    .promise();
            }
        }
    }

    /**
     * Download backup from S3
     */
    async downloadBackup(s3Key: string, localPath: string): Promise<void> {
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
                    console.log(`Downloaded backup: ${localPath}`);
                    resolve();
                }
            });
        });
    }
}

export default DatabaseBackupManager;
