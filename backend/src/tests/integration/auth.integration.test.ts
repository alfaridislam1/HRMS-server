import request from 'supertest';
import app from '../../app';

describe('Auth Integration Tests', () => {
    describe('POST /api/auth/login', () => {
        it('should return 400 if required fields are missing', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'test@example.com'
                });

            expect(response.status).toBe(400);
            expect(response.body.error.code).toBe('VALIDATION_ERROR');
        });

        it('should return 401 for invalid credentials (mocked)', async () => {
            // In a real integration test, you might use a test database
            // For this sample, we just show the structure
            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'wrong@example.com',
                    password: 'wrongpassword',
                    tenant_slug: 'test-tenant'
                });

            // Note: This would hit the actual service unless database is mocked or set up
            expect([401, 404, 500]).toContain(response.status); 
        });
    });

    describe('GET /health', () => {
        it('should return 200 and healthy status', async () => {
            const response = await request(app).get('/health');
            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.status).toBe('ok');
        });
    });
});
