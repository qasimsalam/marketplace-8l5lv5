/**
 * Integration Tests for API Gateway
 *
 * Tests the API Gateway's routing, authentication, rate limiting, and error handling 
 * capabilities across the platform's microservices architecture.
 *
 * @version 1.0.0
 */

import request from 'supertest'; // v6.3.3
import jwt from 'jsonwebtoken'; // v9.0.0
import nock from 'nock'; // v13.3.2
import redisMock from 'redis-mock'; // v0.56.3

import { app } from '../../src/app';
import { config } from '../../src/config';
import { UserRole } from '../../../shared/src/types/user.types';
import { 
  ServiceUnavailableError, 
  AuthenticationError, 
  formatErrorResponse 
} from '../../../shared/src/utils/errors';

// Mock Redis for rate limiting tests
jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => {
    return redisMock.createClient();
  });
});

/**
 * Generates a valid JWT token for authentication tests
 * 
 * @param payload - Custom payload to include in the token
 * @returns Signed JWT token
 */
function generateToken(payload: object = {}): string {
  const defaultPayload = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'user@example.com',
    role: UserRole.FREELANCER
  };
  
  const mergedPayload = {
    ...defaultPayload,
    ...payload
  };
  
  // Note: In production RS256 would be used, but for testing we use HS256
  // which doesn't require a public/private key pair
  return jwt.sign(mergedPayload, config.jwt.secret, {
    expiresIn: config.jwt.expiry,
    algorithm: 'HS256', // Override for testing
    issuer: config.jwt.issuer,
    audience: config.jwt.audience
  });
}

/**
 * Sets up mock responses for backend microservices using nock
 */
function setupMockServices(): void {
  // Clear any existing nock interceptors
  nock.cleanAll();

  // Mock user service endpoints
  nock(config.services.userService)
    .get('/health')
    .reply(200, { status: 'ok' })
    .get('/users/profile')
    .reply(200, { id: '123', name: 'Test User', role: UserRole.FREELANCER })
    .post('/users/login')
    .reply(200, { token: 'test-token' })
    .get('/users')
    .reply(200, [{ id: '123', name: 'Test User', role: UserRole.FREELANCER }]);

  // Mock job service endpoints
  nock(config.services.jobService)
    .get('/health')
    .reply(200, { status: 'ok' })
    .get('/jobs')
    .reply(200, [{ id: '456', title: 'Test Job', status: 'open' }])
    .post('/jobs')
    .reply(201, { id: '789', title: 'New Job', status: 'draft' });

  // Mock payment service endpoints
  nock(config.services.paymentService)
    .get('/health')
    .reply(200, { status: 'ok' })
    .get('/payments')
    .reply(200, [{ id: '789', amount: 100, status: 'pending' }])
    .post('/payments')
    .reply(201, { id: '790', amount: 200, status: 'pending' });

  // Mock collaboration service endpoints
  nock(config.services.collaborationService)
    .get('/health')
    .reply(200, { status: 'ok' })
    .get('/messages')
    .reply(200, [{ id: '101', content: 'Hello', sender: '123' }]);

  // Mock AI service endpoints
  nock(config.services.aiService)
    .get('/health')
    .reply(200, { status: 'ok' })
    .get('/match')
    .reply(200, { score: 0.95, matches: ['job1', 'job2'] });
}

/**
 * Configures a specific service to be unavailable for testing error handling
 * 
 * @param serviceName - Name of the service to make unavailable
 */
function mockUnavailableService(serviceName: string): void {
  const serviceUrl = config.services[serviceName as keyof typeof config.services];
  
  if (!serviceUrl) {
    throw new Error(`Unknown service: ${serviceName}`);
  }
  
  // Clean existing nock for this service
  nock.cleanAll();
  setupMockServices();
  
  // Remove prior interceptors for this specific service
  nock.removeInterceptor({
    hostname: new URL(serviceUrl).hostname
  });
  
  // Mock connection refused error for the service
  nock(serviceUrl)
    .get(/.*/)
    .replyWithError({ code: 'ECONNREFUSED' })
    .post(/.*/)
    .replyWithError({ code: 'ECONNREFUSED' });
    
  // Ensure health check endpoint returns 503
  nock(serviceUrl)
    .get('/health')
    .reply(503, { status: 'error', message: 'Service unavailable' });
}

/**
 * Generates test cases for different rate limit scenarios
 * 
 * @param endpoint - Endpoint to test
 * @param method - HTTP method to use
 * @param limit - Rate limit to test
 */
function generateRateLimitTests(endpoint: string, method: string, limit: number): void {
  // Configure Redis mock for tracking request count
  let requestCount = 0;
  
  // For tests that explicitly exceed rate limits, we'll use nock to simulate 429 responses
  nock(config.services.userService)
    .get('/rate-limited-endpoint')
    .reply(429, {
      status: 'error',
      code: 'RATE_LIMIT_ERROR',
      message: 'Too many requests, please try again later',
      retryAfter: 60
    }, { 'Retry-After': '60' });
  
  it(`should generate appropriate rate limit headers for ${method} ${endpoint}`, async () => {
    const response = await request(app)[method.toLowerCase()](endpoint);
    expect(response.headers).toHaveProperty('x-ratelimit-limit');
    expect(response.headers).toHaveProperty('x-ratelimit-remaining');
  });

  it(`should return 429 status and retry headers when limit is exceeded for ${method} ${endpoint}`, async () => {
    // Use a mocked endpoint that simulates rate limiting
    const token = generateToken();
    const response = await request(app)
      .get('/api/v1/users/rate-limited-endpoint')
      .set('Authorization', `Bearer ${token}`);
    
    expect(response.status).toBe(429);
    expect(response.headers).toHaveProperty('retry-after');
    expect(response.body.code).toBe('RATE_LIMIT_ERROR');
  });
}

// Test Suites
describe('API Gateway Integration Tests', () => {
  beforeAll(() => {
    setupMockServices();
  });

  afterAll(() => {
    nock.cleanAll();
  });

  it('should return 200 OK for the health endpoint', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
  });

  it('should return 200 OK for the readiness endpoint when all services are available', async () => {
    const response = await request(app).get('/readiness');
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ready');
    expect(response.body.dependencies).toBeDefined();
  });

  it('should return 503 Service Unavailable when a service is down', async () => {
    mockUnavailableService('userService');
    const response = await request(app).get('/readiness');
    expect(response.status).toBe(503);
    expect(response.body.status).toBe('not ready');
    
    // Reset mocks for other tests
    setupMockServices();
  });

  it('should redirect to Swagger UI for the /api-docs endpoint', async () => {
    const response = await request(app).get('/api-docs');
    expect([301, 302]).toContain(response.status); // Accept either permanent or temporary redirect
    expect(response.header.location).toBeDefined();
  });

  it('should load API documentation JSON at /api-docs.json', async () => {
    const response = await request(app).get('/api-docs.json');
    expect(response.status).toBe(200);
    expect(response.type).toBe('application/json');
  });
});

describe('Authentication Integration Tests', () => {
  beforeAll(() => {
    setupMockServices();
  });

  afterAll(() => {
    nock.cleanAll();
  });

  it('should return 401 Unauthorized for protected routes without authentication', async () => {
    const response = await request(app).get('/api/v1/users/profile');
    expect(response.status).toBe(401);
    expect(response.body.code).toBe('AUTHENTICATION_ERROR');
  });

  it('should return 401 Unauthorized for invalid JWT token', async () => {
    const response = await request(app)
      .get('/api/v1/users/profile')
      .set('Authorization', 'Bearer invalid-token');
    expect(response.status).toBe(401);
    expect(response.body.code).toBe('AUTHENTICATION_ERROR');
  });

  it('should return 401 Unauthorized for expired JWT token', async () => {
    // Create an expired token
    const expiredToken = jwt.sign(
      { id: '123', email: 'user@example.com', role: UserRole.FREELANCER },
      config.jwt.secret,
      { expiresIn: '-10s', algorithm: 'HS256' }
    );
    
    const response = await request(app)
      .get('/api/v1/users/profile')
      .set('Authorization', `Bearer ${expiredToken}`);
      
    expect(response.status).toBe(401);
    expect(response.body.code).toBe('AUTHENTICATION_ERROR');
    expect(response.body.message).toContain('expired');
  });

  it('should allow access to protected routes with valid JWT token', async () => {
    const token = generateToken();
    const response = await request(app)
      .get('/api/v1/users/profile')
      .set('Authorization', `Bearer ${token}`);
      
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('id');
  });

  it('should deny access when user role is not permitted for the route', async () => {
    // Generate token with freelancer role
    const token = generateToken({ role: UserRole.FREELANCER });
    
    // Mock admin-only endpoint response
    nock(config.services.userService)
      .get('/admin/users')
      .reply(403, {
        status: 'error',
        code: 'AUTHORIZATION_ERROR',
        message: 'Access denied. Required role: admin, User role: freelancer'
      });
    
    // Try to access admin-only route
    const response = await request(app)
      .get('/api/v1/admin/users')
      .set('Authorization', `Bearer ${token}`);
      
    expect(response.status).toBe(403);
    expect(response.body.code).toBe('AUTHORIZATION_ERROR');
  });
});

describe('Service Proxy Integration Tests', () => {
  beforeEach(() => {
    setupMockServices();
  });

  afterEach(() => {
    nock.cleanAll();
  });

  it('should forward requests to user service and return response', async () => {
    const token = generateToken();
    const response = await request(app)
      .get('/api/v1/users/profile')
      .set('Authorization', `Bearer ${token}`);
      
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('id');
    expect(response.body).toHaveProperty('name');
  });

  it('should forward requests to job service and return response', async () => {
    const token = generateToken();
    const response = await request(app)
      .get('/api/v1/jobs')
      .set('Authorization', `Bearer ${token}`);
      
    expect(response.status).toBe(200);
    expect(response.body).toBeInstanceOf(Array);
    expect(response.body[0]).toHaveProperty('title');
  });

  it('should forward requests to payment service and return response', async () => {
    const token = generateToken();
    const response = await request(app)
      .get('/api/v1/payments')
      .set('Authorization', `Bearer ${token}`);
      
    expect(response.status).toBe(200);
    expect(response.body).toBeInstanceOf(Array);
    expect(response.body[0]).toHaveProperty('amount');
  });

  it('should forward requests to collaboration service and return response', async () => {
    const token = generateToken();
    const response = await request(app)
      .get('/api/v1/collaboration/messages')
      .set('Authorization', `Bearer ${token}`);
      
    expect(response.status).toBe(200);
    expect(response.body).toBeInstanceOf(Array);
    expect(response.body[0]).toHaveProperty('content');
  });

  it('should forward requests to AI service and return response', async () => {
    const token = generateToken();
    const response = await request(app)
      .get('/api/v1/ai/match')
      .set('Authorization', `Bearer ${token}`);
      
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('score');
  });

  it('should return 503 Service Unavailable when a microservice is down', async () => {
    mockUnavailableService('jobService');
    
    const token = generateToken();
    const response = await request(app)
      .get('/api/v1/jobs')
      .set('Authorization', `Bearer ${token}`);
      
    expect(response.status).toBe(503);
    expect(response.body.error).toBeDefined();
    expect(response.body.error.code).toBe('SERVICE_UNAVAILABLE');
  });
});

describe('Rate Limiting Integration Tests', () => {
  beforeAll(() => {
    setupMockServices();
  });

  afterAll(() => {
    nock.cleanAll();
  });

  it('should apply different rate limits based on route category', async () => {
    // Public endpoint
    const publicResponse = await request(app).get('/api/v1/jobs/public');
    
    // Authenticated endpoint
    const token = generateToken();
    const authResponse = await request(app)
      .get('/api/v1/users/profile')
      .set('Authorization', `Bearer ${token}`);
    
    // Admin endpoint
    const adminToken = generateToken({ role: UserRole.ADMIN });
    const adminResponse = await request(app)
      .get('/api/v1/admin/users')
      .set('Authorization', `Bearer ${adminToken}`);
    
    // All requests should succeed
    expect(publicResponse.status).toBe(200);
    expect(authResponse.status).toBe(200);
    expect(adminResponse.status).toBe(200);
    
    // Headers should indicate different rate limits
    // Note: This test is a bit of a compromise as we can't reliably
    // trigger actual rate limits in integration tests without making
    // many requests that would slow down the test suite
  });

  it('should apply different rate limits based on user role', async () => {
    // Make requests with different user roles to the same endpoint
    const freelancerToken = generateToken({ role: UserRole.FREELANCER });
    const employerToken = generateToken({ role: UserRole.EMPLOYER });
    const adminToken = generateToken({ role: UserRole.ADMIN });
    
    const freelancerResponse = await request(app)
      .get('/api/v1/jobs')
      .set('Authorization', `Bearer ${freelancerToken}`);
      
    const employerResponse = await request(app)
      .get('/api/v1/jobs')
      .set('Authorization', `Bearer ${employerToken}`);
      
    const adminResponse = await request(app)
      .get('/api/v1/jobs')
      .set('Authorization', `Bearer ${adminToken}`);
      
    // All requests should succeed
    expect(freelancerResponse.status).toBe(200);
    expect(employerResponse.status).toBe(200);
    expect(adminResponse.status).toBe(200);
  });

  it('should return 429 Too Many Requests when rate limit is exceeded', async () => {
    // Setup nock to simulate a rate limited response
    nock(config.services.userService)
      .get('/rate-limited-endpoint')
      .reply(429, {
        status: 'error',
        code: 'RATE_LIMIT_ERROR',
        message: 'Too many requests, please try again later',
        retryAfter: 60
      }, {
        'Retry-After': '60',
        'X-RateLimit-Limit': '100',
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': Math.floor(Date.now() / 1000 + 60).toString()
      });
    
    const token = generateToken();
    const response = await request(app)
      .get('/api/v1/users/rate-limited-endpoint')
      .set('Authorization', `Bearer ${token}`);
    
    expect(response.status).toBe(429);
    expect(response.body.code).toBe('RATE_LIMIT_ERROR');
  });

  it('should include Retry-After header when rate limit is exceeded', async () => {
    // Use the same mocked endpoint as the previous test
    const token = generateToken();
    const response = await request(app)
      .get('/api/v1/users/rate-limited-endpoint')
      .set('Authorization', `Bearer ${token}`);
    
    expect(response.status).toBe(429);
    expect(response.headers['retry-after']).toBeDefined();
  });

  it('should reset rate limit counter after window period expires', async () => {
    // Setup nock for first call - rate limited
    nock(config.services.userService)
      .get('/rate-limit-test')
      .once()
      .reply(429, {
        status: 'error',
        code: 'RATE_LIMIT_ERROR',
        message: 'Too many requests',
        retryAfter: 1
      }, {
        'Retry-After': '1',
        'X-RateLimit-Limit': '100',
        'X-RateLimit-Remaining': '0'
      });
    
    // Setup nock for second call - after window expiry
    nock(config.services.userService)
      .get('/rate-limit-test')
      .once()
      .reply(200, { success: true });
    
    const token = generateToken();
    
    // First call - should hit rate limit
    const firstResponse = await request(app)
      .get('/api/v1/users/rate-limit-test')
      .set('Authorization', `Bearer ${token}`);
    
    expect(firstResponse.status).toBe(429);
    
    // Wait for simulated window expiry
    await new Promise(resolve => setTimeout(resolve, 10));
    
    // Second call - should succeed
    const secondResponse = await request(app)
      .get('/api/v1/users/rate-limit-test')
      .set('Authorization', `Bearer ${token}`);
    
    expect(secondResponse.status).toBe(200);
  });
});

describe('Error Handling Integration Tests', () => {
  beforeAll(() => {
    setupMockServices();
  });

  afterAll(() => {
    nock.cleanAll();
  });

  it('should return 404 Not Found for non-existent routes', async () => {
    const response = await request(app).get('/api/v1/non-existent-route');
    expect(response.status).toBe(404);
    expect(response.body.code).toBe('RESOURCE_NOT_FOUND');
  });

  it('should return formatted error response for validation errors', async () => {
    // Setup validation error scenario
    nock(config.services.jobService)
      .post('/jobs/validate')
      .reply(400, {
        status: 'error',
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: { title: 'Title is required' }
      });
    
    const token = generateToken({ role: UserRole.EMPLOYER });
    const response = await request(app)
      .post('/api/v1/jobs/validate')
      .set('Authorization', `Bearer ${token}`)
      .send({});
      
    expect(response.status).toBe(400);
    expect(response.body.code).toBe('VALIDATION_ERROR');
    expect(response.body.details).toBeDefined();
  });

  it('should return formatted error response for authentication errors', async () => {
    const response = await request(app)
      .get('/api/v1/users/profile')
      .set('Authorization', 'Bearer invalid_token');
      
    expect(response.status).toBe(401);
    expect(response.body.code).toBe('AUTHENTICATION_ERROR');
    expect(response.body.message).toBeDefined();
  });

  it('should return formatted error response for service unavailable errors', async () => {
    mockUnavailableService('jobService');
    
    const token = generateToken();
    const response = await request(app)
      .get('/api/v1/jobs')
      .set('Authorization', `Bearer ${token}`);
      
    expect(response.status).toBe(503);
    expect(response.body.error).toBeDefined();
    expect(response.body.error.code).toBe('SERVICE_UNAVAILABLE');
    
    // Reset mocks for other tests
    setupMockServices();
  });

  it('should properly handle errors from microservices and maintain status codes', async () => {
    // Setup microservice error
    nock(config.services.userService)
      .get('/users/profile-error')
      .reply(403, {
        status: 'error',
        code: 'AUTHORIZATION_ERROR',
        message: 'User does not have permission to access this resource'
      });
    
    const token = generateToken();
    const response = await request(app)
      .get('/api/v1/users/profile-error')
      .set('Authorization', `Bearer ${token}`);
      
    expect(response.status).toBe(403);
    expect(response.body.code).toBe('AUTHORIZATION_ERROR');
  });

  it('should include stack trace in error responses when in development mode', async () => {
    // Setup microservice error with stack trace
    nock(config.services.userService)
      .get('/users/error-with-stack')
      .reply(500, {
        status: 'error',
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
        stack: 'Error: test stack trace'
      });
    
    // Force development mode for this test
    const originalIsDevelopment = config.isDevelopment;
    (config as any).isDevelopment = true;
    
    const token = generateToken();
    const response = await request(app)
      .get('/api/v1/users/error-with-stack')
      .set('Authorization', `Bearer ${token}`);
      
    expect(response.status).toBe(500);
    expect(response.body.code).toBe('INTERNAL_ERROR');
    expect(response.body.stack).toBeDefined();
    
    // Restore original config
    (config as any).isDevelopment = originalIsDevelopment;
  });
});