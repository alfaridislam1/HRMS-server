import path from 'path';

const env = process.env.NODE_ENV || 'development';
const envPath = path.join(__dirname, `../../.env.${env}`);

require('dotenv').config({ path: envPath });
require('dotenv').config();

export const config = {
    env: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || '3000', 10),

    // Database
    database: {
        postgres: {
            host: process.env.DB_HOST || 'localhost',
            port: parseInt(process.env.DB_PORT || '5432', 10),
            user: process.env.DB_USER || 'hrms_dev',
            password: process.env.DB_PASSWORD || 'dev_password',
            database: process.env.DB_NAME || 'hrms_dev',
            pool: {
                min: parseInt(process.env.DB_POOL_MIN || '5', 10),
                max: parseInt(process.env.DB_POOL_MAX || '20', 10),
            },
            ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
        },
        mongodb: {
            url: process.env.MONGO_URL || 'mongodb://localhost:27017/hrms_dev',
        },
    },

    // Redis
    redis: {
        url: process.env.REDIS_URL || 'redis://localhost:6379',
        db: parseInt(process.env.REDIS_DB || '0', 10),
    },

    // JWT
    jwt: {
        secret: process.env.JWT_SECRET || 'change_me_in_production_min_32_chars',
        refreshSecret: process.env.JWT_REFRESH_SECRET || 'change_me_in_production',
        expirySeconds: parseInt(process.env.JWT_EXPIRY || '3600', 10),
        refreshExpirySeconds: parseInt(process.env.JWT_REFRESH_EXPIRY || '604800', 10),
    },

    // OAuth2
    oauth2: {
        google: {
            clientId: process.env.GOOGLE_OAUTH_CLIENT_ID,
            clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET,
            redirectUri: process.env.GOOGLE_OAUTH_REDIRECT_URI,
        },
    },

    // AWS
    aws: {
        region: process.env.AWS_REGION || 'ap-south-1',
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        s3Bucket: process.env.AWS_S3_BUCKET || 'hrms-documents-dev',
        sesEmail: process.env.AWS_SES_EMAIL || 'noreply@hrms.masirat.com',
    },

    // Logging
    logging: {
        level: process.env.LOG_LEVEL || 'debug',
        file: process.env.LOG_FILE || 'logs/app.log',
    },

    // CORS
    cors: {
        origin: (process.env.CORS_ORIGIN || 'http://localhost:5173').split(','),
    },

    // URLs
    urls: {
        api: process.env.API_URL || 'http://localhost:3000',
        frontend: process.env.FRONTEND_URL || 'http://localhost:5173',
    },
};

export default config;
