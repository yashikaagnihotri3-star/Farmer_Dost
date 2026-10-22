import test, { before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdir } from 'node:fs/promises';
import mongoose from 'mongoose';
import { createApp } from './app.js';
import { User } from './models/User.js';
import { disconnectDatabase } from './config/database.js';
import { registerSchema } from './utils/validation.js';
import bcrypt from 'bcrypt';

let memoryMongo;
let app;
const frontendOrigin = 'http://localhost:5173';
const sample = {
  fullName: 'Asha Kaur', email: 'ASHA@example.com', mobile: '9876543210',
  password: 'StrongPass9', preferredLanguage: 'pa', acceptTerms: true,
};

async function csrf(agent) {
  const response = await agent.get('/api/auth/csrf').set('Origin', frontendOrigin).expect(200);
  return response.body.csrfToken;
}

async function postWithCsrf(agent, path, body, status) {
  const token = await csrf(agent);
  return agent.post(path).set('Origin', frontendOrigin).set('X-CSRF-Token', token).send(body).expect(status);
}

before(async () => {
  process.env.MONGOMS_DOWNLOAD_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '.cache/mongodb');
  const { MongoMemoryServer } = await import('mongodb-memory-server');
  const dbPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), `.cache/db-${process.pid}`);
  await mkdir(dbPath, { recursive: true });
  memoryMongo = await MongoMemoryServer.create({ instance: { dbPath, args: ['--wiredTigerCacheSizeGB', '0.25'] } });
  const uri = memoryMongo.getUri('farmer_dost_test');
  await mongoose.connect(uri);
  app = createApp({
    NODE_ENV: 'test', MONGODB_URI: uri, SESSION_SECRET: 'test-only-session-secret-at-least-32-characters',
    FRONTEND_ORIGIN: frontendOrigin, BCRYPT_ROUNDS: 10, TRUST_PROXY: 'false',
    cookie: { httpOnly: true, secure: false, sameSite: 'lax', path: '/' },
  });
});

beforeEach(async () => { await User.deleteMany({}); });

after(async () => {
  await app?.locals.sessionStore.close();
  await mongoose.disconnect();
  await disconnectDatabase();
  await memoryMongo?.stop();
});

test('registers a user, normalizes identity fields, and stores only a bcrypt password hash', async () => {
  const agent = request.agent(app);
  const response = await postWithCsrf(agent, '/api/auth/register', sample, 201);
  assert.equal(response.body.user.email, 'asha@example.com');
  assert.equal(response.body.user.mobile, '+919876543210');
  assert.equal(response.body.user.preferredLanguage, 'pa');
  assert.equal('password' in response.body.user, false);
  assert.equal('passwordHash' in response.body.user, false);
  const stored = await User.findOne({ email: 'asha@example.com' }).select('+passwordHash');
  assert.ok(stored.passwordHash.startsWith('$2'));
  assert.notEqual(stored.passwordHash, sample.password);
  assert.equal(await bcrypt.compare(sample.password, stored.passwordHash), true);
});

test('rejects invalid registration input on the server', async () => {
  const agent = request.agent(app);
  const response = await postWithCsrf(agent, '/api/auth/register', { ...sample, email: 'not-an-email', acceptTerms: false }, 400);
  assert.equal(response.body.error.code, 'VALIDATION_ERROR');
  assert.ok(response.body.error.fields.email);
  assert.ok(response.body.error.fields.acceptTerms);
});

test('rejects duplicate email and mobile registrations with safe conflict codes', async () => {
  const agent = request.agent(app);
  await postWithCsrf(agent, '/api/auth/register', sample, 201);
  const duplicateEmail = await postWithCsrf(agent, '/api/auth/register', { ...sample, mobile: '9123456789' }, 409);
  assert.equal(duplicateEmail.body.error.code, 'EMAIL_TAKEN');
  const duplicateMobile = await postWithCsrf(agent, '/api/auth/register', { ...sample, email: 'another@example.com' }, 409);
  assert.equal(duplicateMobile.body.error.code, 'MOBILE_TAKEN');
});

test('logs in with email or mobile, regenerates a session, and returns no hash', async () => {
  const agent = request.agent(app);
  await postWithCsrf(agent, '/api/auth/register', sample, 201);
  const response = await postWithCsrf(agent, '/api/auth/login', { identifier: 'asha@example.com', password: sample.password }, 200);
  assert.equal(response.body.user.email, 'asha@example.com');
  assert.match(response.headers['set-cookie'].join(';'), /HttpOnly/i);
  assert.match(response.headers['set-cookie'].join(';'), /SameSite=Lax/i);
  assert.equal('passwordHash' in response.body.user, false);
  const me = await agent.get('/api/auth/me').set('Origin', frontendOrigin).expect(200);
  assert.equal(me.body.user.id, response.body.user.id);
});

test('rejects incorrect passwords and unknown identifiers with the same response', async () => {
  const agent = request.agent(app);
  await postWithCsrf(agent, '/api/auth/register', sample, 201);
  const wrongPassword = await postWithCsrf(agent, '/api/auth/login', { identifier: sample.email, password: 'WrongPass9' }, 401);
  const missingUser = await postWithCsrf(agent, '/api/auth/login', { identifier: 'missing@example.com', password: 'WrongPass9' }, 401);
  assert.deepEqual(wrongPassword.body, missingUser.body);
  assert.equal(wrongPassword.body.error.code, 'INVALID_CREDENTIALS');
});

test('requires authentication for current user and preferences', async () => {
  const agent = request.agent(app);
  await agent.get('/api/auth/me').expect(401);
  const token = await csrf(agent);
  await agent.patch('/api/auth/me/preferences').set('X-CSRF-Token', token).send({ preferredLanguage: 'hi' }).expect(401);
});

test('persists language preference and clears session on logout', async () => {
  const agent = request.agent(app);
  await postWithCsrf(agent, '/api/auth/register', sample, 201);
  await postWithCsrf(agent, '/api/auth/login', { identifier: '9876543210', password: sample.password }, 200);
  const token = await csrf(agent);
  const updated = await agent.patch('/api/auth/me/preferences').set('Origin', frontendOrigin).set('X-CSRF-Token', token).send({ preferredLanguage: 'hi' }).expect(200);
  assert.equal(updated.body.user.preferredLanguage, 'hi');
  await postWithCsrf(agent, '/api/auth/logout', undefined, 204);
  await agent.get('/api/auth/me').expect(401);
});

test('enforces CSRF token and emits consistent not-found/error responses', async () => {
  const agent = request.agent(app);
  await agent.post('/api/auth/logout').set('Origin', frontendOrigin).expect(403);
  const missing = await agent.get('/api/missing').expect(404);
  assert.equal(missing.body.error.code, 'NOT_FOUND');
});

test('registration schema rejects unsupported languages and passwords over bcrypt limits', () => {
  assert.equal(registerSchema.safeParse({ ...sample, preferredLanguage: 'fr' }).success, false);
  assert.equal(registerSchema.safeParse({ ...sample, password: `${'A'.repeat(71)}a1` }).success, false);
  assert.equal(registerSchema.safeParse({ ...sample, password: `${'A'.repeat(50)}${'😀'.repeat(6)}a1` }).success, false);
});
