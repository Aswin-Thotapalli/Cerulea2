const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', 'data');

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function userDir(userId) {
  const p = path.join(ROOT, 'users', userId);
  ensureDir(p);
  return p;
}

function readJSON(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf-8'));
  } catch {
    return fallback;
  }
}

function writeJSON(file, data) {
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function userFile(userId, name) {
  return path.join(userDir(userId), `${name}.json`);
}

function getAll(userId, name) {
  const f = userFile(userId, name);
  return readJSON(f, []);
}

function putAll(userId, name, arr) {
  const f = userFile(userId, name);
  writeJSON(f, arr);
}

function upsertById(userId, name, item) {
  const list = getAll(userId, name);
  const idx = list.findIndex((x) => x.id === item.id);
  if (idx >= 0) list[idx] = { ...list[idx], ...item, updatedAt: new Date().toISOString() };
  else list.push({ ...item, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
  putAll(userId, name, list);
  return item;
}

function genId(prefix) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

module.exports = {
  getAll, putAll, upsertById, genId,
};
