import request from 'supertest';
import app from '../src/app';

describe('Auth API', () => {
    it('should register a new user', async () => {
        const res = await request(app)
            .post('/api/v1/auth/register')
            .send({
                email: `test_${Date.now()}@example.com`,
                password: 'password123',
                name: 'Test User'
            });
        expect(res.statusCode).toEqual(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data).toHaveProperty('accessToken');
    });

    it('should fail registration with invalid data', async () => {
        const res = await request(app)
            .post('/api/v1/auth/register')
            .send({
                email: 'invalid-email',
                password: 'pass',
                name: 'Test User'
            });
        expect(res.statusCode).toEqual(400);
    });
});
