import test, { before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import mongoose from 'mongoose';
import os from 'node:os';
import path from 'node:path';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createApp } from './app.js';
import { User } from './models/User.js';
import { SoilReport } from './models/SoilReport.js';

const frontendOrigin = 'http://localhost:5173';
const sample = {
  reportName: 'QA north plot', farmerName: 'Test Farmer', soilType: 'Loamy',
  soilPH: 6.8, nitrogen: 120, phosphorus: 45, potassium: 60,
  organicCarbon: 0.8, moisture: 35, electricalConductivity: 0.4,
  testDate: '2026-11-05', location: 'Test field',
};
let memoryMongo;
let app;
let server;
let apiBase;
let uploadRoot;
let tempDbPath;

async function csrf(agent) {
  return (await agent.get('/api/auth/csrf').set('Origin', frontendOrigin).expect(200)).body.csrfToken;
}
async function postWithCsrf(agent, url, body, status) {
  return agent.post(url).set('Origin', frontendOrigin).set('X-CSRF-Token', await csrf(agent)).send(body).expect(status);
}
async function createAuthenticatedAgent(email) {
  const agent = request.agent(apiBase);
  const signupCsrf = await csrf(agent);
  await agent.post('/api/auth/register').set('Origin', frontendOrigin).set('X-CSRF-Token', signupCsrf).send({
    fullName: 'Soil QA User', email, mobile: email === 'soil-a@example.com' ? '9876543210' : '9123456789',
    password: 'StrongPass9', preferredLanguage: 'en', acceptTerms: true,
  }).expect(201);
  await postWithCsrf(agent, '/api/auth/login', { identifier: email, password: 'StrongPass9' }, 200);
  return agent;
}

before(async () => {
  let setupStage = 'initializing';
  try {
  const backendDir = path.dirname(fileURLToPath(import.meta.url));
  process.env.MONGOMS_DOWNLOAD_DIR = path.join(backendDir, '.cache', 'mongodb');
  tempDbPath = path.join(backendDir, '.cache', `db-soil-${process.pid}`);
  await mkdir(tempDbPath, { recursive: true });
  const { MongoMemoryServer } = await import('mongodb-memory-server');
  setupStage = 'starting MongoDB Memory Server';
  memoryMongo = await MongoMemoryServer.create({ instance: { dbPath: tempDbPath, args: ['--wiredTigerCacheSizeGB', '0.25'] } });
  const uri = memoryMongo.getUri('farmer_dost_soil_test');
  setupStage = 'connecting Mongoose';
  await mongoose.connect(uri);
  uploadRoot = await mkdtemp(path.join(os.tmpdir(), 'farmer-dost-soil-'));
  setupStage = 'creating app';
  app = createApp({
    NODE_ENV: 'test', MONGODB_URI: uri, SESSION_SECRET: 'test-only-session-secret-at-least-32-characters',
    FRONTEND_ORIGIN: frontendOrigin, BCRYPT_ROUNDS: 10, TRUST_PROXY: 'false', SOIL_UPLOAD_DIR: uploadRoot,
    cookie: { httpOnly: true, secure: false, sameSite: 'lax', path: '/' },
  });
  await User.init();
  await SoilReport.init();
  server = app.listen(0, '127.0.0.1');
  await new Promise((resolve, reject) => { server.once('listening', resolve); server.once('error', reject); });
  apiBase = `http://127.0.0.1:${server.address().port}`;
  } catch (error) {
    console.error(`Soil test setup failed while ${setupStage}:`, error);
    throw error;
  }
});

beforeEach(async () => {
  await SoilReport.deleteMany({});
  await User.deleteMany({});
  for (const name of await (await import('node:fs/promises')).readdir(uploadRoot)) await rm(path.join(uploadRoot, name), { recursive: true, force: true });
});

after(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
  await app?.locals.sessionStore.close();
  await mongoose.disconnect();
  await memoryMongo?.stop();
  if (uploadRoot) await rm(uploadRoot, { recursive: true, force: true });
  if (tempDbPath) await rm(tempDbPath, { recursive: true, force: true });
});

test('requires the existing authenticated session and CSRF token', async () => {
  const agent = request.agent(apiBase);
  await agent.get('/api/soil-reports').expect(401);
  await agent.post('/api/soil-reports').set('Origin', frontendOrigin).send(sample).expect(401);
  const user = await createAuthenticatedAgent('soil-a@example.com');
  await user.post('/api/soil-reports').set('Origin', frontendOrigin).send(sample).expect(403);
});

test('creates, reads, updates, and deletes only the authenticated user reports', async () => {
  const first = await createAuthenticatedAgent('soil-a@example.com');
  const created = await postWithCsrf(first, '/api/soil-reports', sample, 201);
  const id = created.body.report.id;
  assert.equal(created.body.report.soilPH, 6.8);
  assert.equal((await SoilReport.findById(id).lean()).userId.toString(), created.body.report.userId ?? (await User.findOne({ email: 'soil-a@example.com' })).id);
  const list = await first.get('/api/soil-reports').expect(200);
  assert.equal(list.body.reports.length, 1);
  assert.equal((await first.get(`/api/soil-reports/${id}`).expect(200)).body.report.reportName, sample.reportName);

  const second = await createAuthenticatedAgent('soil-b@example.com');
  assert.equal((await second.get('/api/soil-reports').expect(200)).body.reports.length, 0);
  await second.get(`/api/soil-reports/${id}`).expect(404);
  await second.put(`/api/soil-reports/${id}`).set('Origin', frontendOrigin).set('X-CSRF-Token', await csrf(second)).send({ reportName: 'Intrusion' }).expect(404);
  await second.delete(`/api/soil-reports/${id}`).set('Origin', frontendOrigin).set('X-CSRF-Token', await csrf(second)).expect(404);
  assert.equal((await SoilReport.findById(id)).reportName, sample.reportName);

  const updated = await first.put(`/api/soil-reports/${id}`).set('Origin', frontendOrigin).set('X-CSRF-Token', await csrf(first)).send({ ...sample, reportName: 'Updated QA plot', soilPH: 7.1 }).expect(200);
  assert.equal(updated.body.report.reportName, 'Updated QA plot');
  assert.equal(updated.body.report.soilPH, 7.1);
  await first.delete(`/api/soil-reports/${id}`).set('Origin', frontendOrigin).set('X-CSRF-Token', await csrf(first)).expect(204);
  await first.get(`/api/soil-reports/${id}`).expect(404);
});

test('validates required values and numerical ranges', async () => {
  const agent = await createAuthenticatedAgent('soil-a@example.com');
  const missing = await postWithCsrf(agent, '/api/soil-reports', { ...sample, reportName: '' }, 400);
  assert.equal(missing.body.error.code, 'VALIDATION_ERROR');
  assert.ok(missing.body.error.fields.reportName);
  const invalidPh = await postWithCsrf(agent, '/api/soil-reports', { ...sample, soilPH: 14.1 }, 400);
  assert.ok(invalidPh.body.error.fields.soilPH);
  const invalidDate = await postWithCsrf(agent, '/api/soil-reports', { ...sample, testDate: '2026-02-31' }, 400);
  assert.equal(invalidDate.body.error.code, 'VALIDATION_ERROR');
  const forgedOwner = await postWithCsrf(agent, '/api/soil-reports', { ...sample, userId: '000000000000000000000000' }, 400);
  assert.equal(forgedOwner.body.error.code, 'VALIDATION_ERROR');
});

test('uploads a private file, attaches it to a report, serves it only to its owner, and cleans it on deletion', async () => {
  const first = await createAuthenticatedAgent('soil-a@example.com');
  const pdf = Buffer.from('%PDF-1.7\nsoil report test\n%%EOF');
  const upload = await first.post('/api/soil-reports/upload').set('Origin', frontendOrigin).set('X-CSRF-Token', await csrf(first)).attach('file', pdf, { filename: 'lab report.pdf', contentType: 'application/pdf' }).expect(201);
  assert.equal(upload.body.file.originalName, 'lab report.pdf');
  assert.equal(upload.body.file.mimeType, 'application/pdf');
  const created = await postWithCsrf(first, '/api/soil-reports', { ...sample, uploadId: upload.body.file.uploadId }, 201);
  assert.equal(created.body.report.reportFile.originalName, 'lab report.pdf');
  assert.equal('storageId' in created.body.report.reportFile, false);
  const viewed = await first.get(`/api/soil-reports/${created.body.report.id}/file`).buffer(true).parse((res, callback) => {
    const chunks = []; res.on('data', (chunk) => chunks.push(chunk)); res.on('end', () => callback(null, Buffer.concat(chunks)));
  }).expect(200);
  assert.equal(viewed.headers['content-type'], 'application/pdf');
  assert.deepEqual(viewed.body, pdf);
  const second = await createAuthenticatedAgent('soil-b@example.com');
  await second.get(`/api/soil-reports/${created.body.report.id}/file`).expect(404);
  await first.delete(`/api/soil-reports/${created.body.report.id}`).set('Origin', frontendOrigin).set('X-CSRF-Token', await csrf(first)).expect(204);
  await first.get(`/api/soil-reports/${created.body.report.id}/file`).expect(404);
});

test('rejects bad file types and content signatures', async () => {
  const agent = await createAuthenticatedAgent('soil-a@example.com');
  await agent.post('/api/soil-reports/upload').set('Origin', frontendOrigin).set('X-CSRF-Token', await csrf(agent)).attach('file', Buffer.from('not a png'), { filename: 'bad.png', contentType: 'image/png' }).expect(415);
  await agent.post('/api/soil-reports/upload').set('Origin', frontendOrigin).set('X-CSRF-Token', await csrf(agent)).attach('file', Buffer.from('not allowed'), { filename: 'bad.txt', contentType: 'text/plain' }).expect(415);
  await agent.post('/api/soil-reports/upload').set('Origin', frontendOrigin).set('X-CSRF-Token', await csrf(agent)).attach('file', Buffer.alloc(10 * 1024 * 1024 + 1), { filename: 'large.pdf', contentType: 'application/pdf' }).expect(413);
});
