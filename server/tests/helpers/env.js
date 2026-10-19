// Loaded by Jest before every test file (see "setupFiles" in package.json).
process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = 'test-access-secret-0123456789-abcdefghijklmnop';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-0123456789-abcdefghijklmno';
process.env.JWT_ACCESS_EXPIRES_IN = '15m';
process.env.BCRYPT_SALT_ROUNDS = '4'; // fast hashing in tests
process.env.AUTH_RATE_LIMIT_MAX = '1000';
process.env.API_RATE_LIMIT_MAX = '10000';
process.env.CLIENT_URL = 'http://localhost:5173';
process.env.GOOGLE_CLIENT_ID = '';
process.env.GOOGLE_CLIENT_SECRET = '';
process.env.FACEBOOK_APP_ID = '';
process.env.FACEBOOK_APP_SECRET = '';
