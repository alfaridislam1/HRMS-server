/**
 * Complete Example: HRMS API Implementation
 * 
 * This file shows a complete working example of how to use all the
 * API routes, middleware, and security features together.
 */

import express, { Request, Response, Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import APIRouter from './routes';
import { generateToken, JWTPayload } from './middleware/jwtAuth';
import { createRateLimiters } from './middleware/rateLimiter';

// ============================================================
// Application Setup
// ============================================================

const app: Express = express();

// Security middleware
app.use(helmet());
app.use(cors({
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ============================================================
// Initialize API Routes
// ============================================================

const apiRouter = new APIRouter(app);
apiRouter.initialize();

// ============================================================
// Example: Authentication Endpoints (Not obfuscated for demo)
// ============================================================

/**
 * POST /auth/login
 * Authenticate user and return JWT token
 */
app.post('/auth/login', async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;

        // TODO: Validate email/password against database
        if (!email || !password) {
            return res.status(400).json({
                error: {
                    code: 'INVALID_CREDENTIALS',
                    message: 'Email and password are required'
                }
            });
        }

        // TODO: Query database for user
        // const user = await db('users')
        //   .where('email', email)
        //   .where('status', 'active')
        //   .first();
        //
        // if (!user || !await bcrypt.compare(password, user.password_hash)) {
        //   return res.status(401).json({
        //     error: {
        //       code: 'INVALID_CREDENTIALS',
        //       message: 'Invalid email or password'
        //     }
        //   });
        // }

        // Mock user for demonstration
        const user = {
            id: 'user-' + Date.now(),
            email: email,
            tenantId: 'tenant-123',
            role: 'admin',
            permissions: ['*']
        };

        // Generate token (24 hours validity)
        const token = generateToken({
            userId: user.id,
            tenantId: user.tenantId,
            role: user.role,
            email: user.email,
            permissions: user.permissions
        }, '24h');

        res.json({
            data: {
                token,
                user: {
                    id: user.id,
                    email: user.email,
                    role: user.role,
                    tenantId: user.tenantId
                }
            }
        });
    } catch (error: any) {
        res.status(500).json({
            error: {
                code: 'LOGIN_ERROR',
                message: error.message
            }
        });
    }
});

/**
 * POST /auth/refresh
 * Refresh JWT token
 */
app.post('/auth/refresh', async (req: Request, res: Response) => {
    try {
        const { token } = req.body;

        if (!token) {
            return res.status(400).json({
                error: {
                    code: 'MISSING_TOKEN',
                    message: 'Token is required'
                }
            });
        }

        // TODO: Verify token is valid (even if expired)
        // For demo, just regenerate
        const newToken = generateToken({
            userId: 'user-123',
            tenantId: 'tenant-123',
            role: 'admin',
            email: 'admin@company.com',
            permissions: ['*']
        }, '24h');

        res.json({
            data: { token: newToken }
        });
    } catch (error: any) {
        res.status(500).json({
            error: {
                code: 'REFRESH_ERROR',
                message: error.message
            }
        });
    }
});

/**
 * POST /auth/logout
 * Logout user (add token to blacklist)
 */
app.post('/auth/logout', (req: Request, res: Response) => {
    // TODO: Add token to Redis blacklist with expiration
    // await redis.setex(`blacklist:${token}`, ttl, 'true');

    res.json({
        message: 'Logged out successfully'
    });
});

// ============================================================
// Example: User Profile Endpoints (Not obfuscated for demo)
// ============================================================

/**
 * GET /auth/profile
 * Get current user profile
 */
app.get('/auth/profile', (req: Request, res: Response) => {
    const user = (req as any).user;

    if (!user) {
        return res.status(401).json({
            error: {
                code: 'NOT_AUTHENTICATED',
                message: 'User not authenticated'
            }
        });
    }

    res.json({
        data: {
            id: user.userId,
            email: user.email,
            role: user.role,
            tenantId: user.tenantId,
            permissions: user.permissions
        }
    });
});

// ============================================================
// Example: Analytics Endpoints (Obfuscated)
// ============================================================

/**
 * GET /api/analytics/employee-trends
 * Obfuscated as: /asjhdalksjhdasjdhaksjd/192837461923874612983
 * Get employee trends analytics
 */
app.get('/api/analytics/employee-trends', (req: Request, res: Response) => {
    const tenantId = (req as any).tenantId;

    // Mock analytics data
    res.json({
        data: {
            timestamp: new Date().toISOString(),
            trends: {
                newHires: 45,
                departures: 8,
                averageTenure: 3.5,
                retentionRate: 92
            }
        }
    });
});

// ============================================================
// Example: Custom Rate Limiter Integration
// ============================================================

const rateLimiters = createRateLimiters();

/**
 * Strict rate limit for auth endpoints
 * Only 5 attempts per minute
 */
app.post('/auth/login', rateLimiters.authLimiter.middleware(), (req, res) => {
    // Login handler
});

// ============================================================
// Health & Status Endpoints
// ============================================================

/**
 * GET /health
 * Service health check
 */
app.get('/health', (req: Request, res: Response) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development'
    });
});

/**
 * GET /health/db
 * Database health check
 */
app.get('/health/db', async (req: Request, res: Response) => {
    try {
        // TODO: Test database connection
        // const result = await db.raw('SELECT 1');

        res.json({
            status: 'connected',
            database: 'postgresql',
            responseTime: '5ms'
        });
    } catch (error: any) {
        res.status(503).json({
            status: 'disconnected',
            error: error.message
        });
    }
});

/**
 * GET /health/cache
 * Cache (Redis) health check
 */
app.get('/health/cache', async (req: Request, res: Response) => {
    try {
        // TODO: Test Redis connection
        // await redis.ping();

        res.json({
            status: 'connected',
            cache: 'redis',
            responseTime: '2ms'
        });
    } catch (error: any) {
        res.status(503).json({
            status: 'disconnected',
            error: error.message
        });
    }
});

// ============================================================
// Example: Batch Operations
// ============================================================

/**
 * POST /api/batch
 * Execute multiple operations in a batch
 * Example: Create multiple employees at once
 */
app.post('/api/batch', async (req: Request, res: Response) => {
    try {
        const { operations } = req.body;

        if (!Array.isArray(operations)) {
            return res.status(400).json({
                error: {
                    code: 'INVALID_BATCH',
                    message: 'operations must be an array'
                }
            });
        }

        // Limit batch size
        if (operations.length > 100) {
            return res.status(400).json({
                error: {
                    code: 'BATCH_TOO_LARGE',
                    message: 'Maximum 100 operations per batch'
                }
            });
        }

        const results = [];

        for (const op of operations) {
            try {
                // TODO: Process each operation
                // Based on op.method and op.path
                results.push({
                    id: op.id,
                    status: 'success',
                    data: {}
                });
            } catch (error: any) {
                results.push({
                    id: op.id,
                    status: 'error',
                    error: error.message
                });
            }
        }

        res.json({
            data: {
                total: operations.length,
                succeeded: results.filter(r => r.status === 'success').length,
                failed: results.filter(r => r.status === 'error').length,
                results
            }
        });
    } catch (error: any) {
        res.status(500).json({
            error: {
                code: 'BATCH_ERROR',
                message: error.message
            }
        });
    }
});

// ============================================================
// Example: Webhook Management
// ============================================================

const webhooks: Array<{
    id: string;
    url: string;
    events: string[];
    active: boolean;
}> = [];

/**
 * POST /api/webhooks
 * Register a webhook
 */
app.post('/api/webhooks', (req: Request, res: Response) => {
    const { url, events } = req.body;
    const tenantId = (req as any).tenantId;

    if (!url || !Array.isArray(events) || events.length === 0) {
        return res.status(400).json({
            error: {
                code: 'INVALID_WEBHOOK',
                message: 'url and events are required'
            }
        });
    }

    const webhook = {
        id: 'webhook-' + Date.now(),
        url,
        events,
        active: true
    };

    webhooks.push(webhook);

    res.status(201).json({
        data: webhook,
        message: 'Webhook registered successfully'
    });
});

/**
 * POST /api/webhooks/:id/test
 * Test webhook delivery
 */
app.post('/api/webhooks/:id/test', async (req: Request, res: Response) => {
    const { id } = req.params;

    const webhook = webhooks.find(w => w.id === id);
    if (!webhook) {
        return res.status(404).json({
            error: {
                code: 'NOT_FOUND',
                message: 'Webhook not found'
            }
        });
    }

    try {
        // TODO: Send test payload to webhook URL
        // const response = await fetch(webhook.url, {
        //   method: 'POST',
        //   body: JSON.stringify({ test: true })
        // });

        res.json({
            message: 'Webhook test successful',
            statusCode: 200
        });
    } catch (error: any) {
        res.status(400).json({
            error: {
                code: 'WEBHOOK_DELIVERY_FAILED',
                message: error.message
            }
        });
    }
});

// ============================================================
// Example: Metrics & Monitoring
// ============================================================

let requestCount = 0;
let errorCount = 0;

/**
 * GET /metrics
 * Application metrics
 */
app.get('/metrics', (req: Request, res: Response) => {
    res.json({
        data: {
            requests: {
                total: requestCount,
                errors: errorCount,
                errorRate: (errorCount / requestCount * 100).toFixed(2) + '%'
            },
            uptime: process.uptime(),
            memory: {
                heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
                heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + 'MB'
            },
            timestamp: new Date().toISOString()
        }
    });
});

// ============================================================
// Server Startup
// ============================================================

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
    console.log(`\n${'='.repeat(60)}`);
    console.log('🚀 HRMS API Server Started');
    console.log(`${'='.repeat(60)}\n`);
    console.log(`📍 Server: http://localhost:${PORT}`);
    console.log(`📚 API Docs: http://localhost:${PORT}/api/routes`);
    console.log(`🏥 Health: http://localhost:${PORT}/health\n`);
    console.log('Authentication:');
    console.log('  POST /auth/login - Get JWT token');
    console.log('  GET /auth/profile - View profile');
    console.log('  POST /auth/logout - Logout\n');
    console.log('Obfuscated Routes:');
    console.log('  GET /yoiusalkasja/... - List employees');
    console.log('  POST /poiqweuoisajd/... - Create employee');
    console.log('  POST /tyuiopqwer/... - Request leave\n');
    console.log(`${'='.repeat(60)}\n`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully...');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});

export default app;

// ============================================================
// Usage Examples
// ============================================================

/*

1. GET TOKEN
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@company.com",
    "password": "password123"
  }'

Response:
{
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "user-123",
      "email": "admin@company.com",
      "role": "admin",
      "tenantId": "tenant-123"
    }
  }
}

2. LIST EMPLOYEES
curl -X GET http://localhost:3000/yoiusalkasja/ausoiahs1896347ih2ewdkjags \
  -H "Authorization: Bearer YOUR_TOKEN"

3. CREATE EMPLOYEE
curl -X POST http://localhost:3000/poiqweuoisajd/129312893jksahjkhd123123 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@company.com",
    "firstName": "John",
    "lastName": "Doe",
    "departmentId": "dept-123",
    "designationId": "des-456",
    "dateOfJoining": "2024-02-01"
  }'

4. REQUEST LEAVE
curl -X POST http://localhost:3000/tyuiopqwer/asdfghjklzxcvbnmasdfghjkl \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "leaveTypeId": "leave-123",
    "startDate": "2024-02-15",
    "endDate": "2024-02-17",
    "reason": "Sick leave"
  }'

5. GET HEALTH
curl http://localhost:3000/health

6. GET METRICS
curl http://localhost:3000/metrics

*/
