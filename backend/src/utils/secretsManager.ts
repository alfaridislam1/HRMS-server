import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { logger } from '@config/logger';

/**
 * AWS Secrets Manager Integration
 * Fetches secrets securely from AWS Secrets Manager
 */

let secretsManagerClient: SecretsManagerClient | null = null;

/**
 * Initialize Secrets Manager client
 */
function getSecretsManagerClient(): SecretsManagerClient | null {
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
        return null;
    }
    if (!secretsManagerClient) {
        secretsManagerClient = new SecretsManagerClient({
            region: process.env.AWS_REGION || 'ap-south-1',
        });
    }
    return secretsManagerClient;
}

/**
 * Get secret value from AWS Secrets Manager
 */
export async function getSecret(secretName: string): Promise<string> {
    try {
        const client = getSecretsManagerClient();
        if (!client) {
            logger.debug(`Skipping AWS secret fetch (no credentials): ${secretName}`);
            return '';
        }
        const command = new GetSecretValueCommand({
            SecretId: secretName,
        });

        const response = await client.send(command);

        if (response.SecretString) {
            return response.SecretString;
        } else if (response.SecretBinary) {
            return Buffer.from(response.SecretBinary).toString('utf-8');
        } else {
            throw new Error('Secret value is empty');
        }
    } catch (error: any) {
        logger.error(`Failed to get secret ${secretName}:`, error);
        throw error;
    }
}

/**
 * Get JSON secret from AWS Secrets Manager
 */
export async function getSecretJSON<T = any>(secretName: string): Promise<T> {
    const secretString = await getSecret(secretName);
    try {
        return JSON.parse(secretString) as T;
    } catch (error) {
        logger.error(`Failed to parse secret ${secretName} as JSON:`, error);
        throw new Error(`Secret ${secretName} is not valid JSON`);
    }
}

/**
 * Load secrets from AWS Secrets Manager and set as environment variables
 * Useful for startup initialization
 */
export async function loadSecretsIntoEnv(secretNames: string[]): Promise<void> {
    for (const secretName of secretNames) {
        try {
            const secretValue = await getSecret(secretName);

            // If secret is JSON, parse and set individual keys
            try {
                const secretJson = JSON.parse(secretValue);
                for (const [key, value] of Object.entries(secretJson)) {
                    if (!process.env[key]) {
                        process.env[key] = String(value);
                        logger.debug(`Loaded secret ${secretName}.${key} into environment`);
                    }
                }
            } catch {
                // Not JSON, use secret name as env var name
                const envKey = secretName.split('/').pop()?.toUpperCase().replace(/-/g, '_') || secretName;
                if (!process.env[envKey]) {
                    process.env[envKey] = secretValue;
                    logger.debug(`Loaded secret ${secretName} as ${envKey}`);
                }
            }
        } catch (error: any) {
            logger.warn(`Failed to load secret ${secretName}:`, error.message);
            // Don't throw - allow app to continue with existing env vars
        }
    }
}

/**
 * Common secret names for HRMS
 */
export const HRMS_SECRETS = {
    DB_PASSWORD: 'hrms/db/password',
    JWT_SECRET: 'hrms/jwt/secret',
    JWT_REFRESH_SECRET: 'hrms/jwt/refresh-secret',
    MONGO_URL: 'hrms/mongo/url',
    REDIS_URL: 'hrms/redis/url',
    GOOGLE_OAUTH_CLIENT_SECRET: 'hrms/oauth/google/client-secret',
    MICROSOFT_OAUTH_CLIENT_SECRET: 'hrms/oauth/microsoft/client-secret',
    GITHUB_OAUTH_CLIENT_SECRET: 'hrms/oauth/github/client-secret',
    AWS_S3_ACCESS_KEY: 'hrms/aws/s3/access-key',
    AWS_S3_SECRET_KEY: 'hrms/aws/s3/secret-key',
    SMTP_PASSWORD: 'hrms/smtp/password',
} as const;

/**
 * Load all HRMS secrets at startup
 */
export async function loadHRMSSecrets(): Promise<void> {
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
        logger.info('Skipping AWS Secrets Manager initialization (no credentials found)');
        return;
    }
    const secretNames = Object.values(HRMS_SECRETS);
    await loadSecretsIntoEnv(secretNames);
    logger.info(`Loaded ${secretNames.length} secrets from AWS Secrets Manager`);
}
