const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const USERS_PATH = path.join(__dirname, '..', 'data', 'users.json');

if (!fs.existsSync(USERS_PATH)) {
  fs.writeFileSync(USERS_PATH, JSON.stringify({ users: [] }, null, 2));
}

function readAll() {
  return JSON.parse(fs.readFileSync(USERS_PATH, 'utf-8'));
}

function writeAll(data) {
  fs.writeFileSync(USERS_PATH, JSON.stringify(data, null, 2));
}

function findById(id) {
  return readAll().users.find(u => u.id === id) || null;
}

function findByEmail(email) {
  const normalized = String(email || '').trim().toLowerCase();
  return readAll().users.find(u => u.email === normalized) || null;
}

function findByGoogleId(googleId) {
  return readAll().users.find(u => u.googleId === googleId) || null;
}

function createUser({ name, email, passwordHash = null, googleId = null }) {
  const data = readAll();
  const user = {
    id: crypto.randomUUID(),
    name,
    email: String(email).trim().toLowerCase(),
    passwordHash,
    googleId,
    createdAt: new Date().toISOString()
  };
  data.users.push(user);
  writeAll(data);
  return user;
}

function linkGoogleId(userId, googleId) {
  const data = readAll();
  const user = data.users.find(u => u.id === userId);
  if (!user) return null;
  user.googleId = googleId;
  writeAll(data);
  return user;
}

function toPublic(user) {
  if (!user) return null;
  return { id: user.id, name: user.name, email: user.email };
}

module.exports = { findById, findByEmail, findByGoogleId, createUser, linkGoogleId, toPublic };
