const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const router = express.Router();
const users = new Map(); // email -> { id, name, email, hash }

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
const isProd = process.env.NODE_ENV === 'production';

function cookieOptions() {
  const base = { httpOnly: true, sameSite: 'lax', path: '/' };
  if (isProd) {
    base.secure = true;
    base.domain = '.cerulea.app';
  }
  return base;
}

function sign(user) {
  return jwt.sign({ sub: user.id, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: '7d' });
}

router.post('/register', async (req, res) => {
  const { name, email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ message: 'Missing fields' });
  if (users.has(email)) return res.status(409).json({ message: 'User exists' });
  const hash = await bcrypt.hash(password, 10);
  const user = { id: String(users.size + 1), name: name || '', email, hash };
  users.set(email, user);
  const token = sign(user);
  res.cookie('cerulea_jwt', token, { ...cookieOptions(), maxAge: 7 * 24 * 60 * 60 * 1000 });
  res.json({ id: user.id, email: user.email, name: user.name });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  const user = users.get(email);
  if (!user) return res.status(401).json({ message: 'Invalid credentials' });
  const ok = await bcrypt.compare(password, user.hash);
  if (!ok) return res.status(401).json({ message: 'Invalid credentials' });
  const token = sign(user);
  res.cookie('cerulea_jwt', token, { ...cookieOptions(), maxAge: 7 * 24 * 60 * 60 * 1000 });
  res.json({ id: user.id, email: user.email, name: user.name });
});

router.post('/logout', (req, res) => {
  res.cookie('cerulea_jwt', '', { ...cookieOptions(), maxAge: 0 });
  res.json({ ok: true });
});

router.get('/me', (req, res) => {
  try {
    const token = req.cookies?.cerulea_jwt;
    if (!token) return res.status(401).end();
    const payload = jwt.verify(token, JWT_SECRET);
    const user = Array.from(users.values()).find(u => u.id === String(payload.sub));
    if (!user) return res.status(401).end();
    res.json({ id: user.id, email: user.email, name: user.name });
  } catch { return res.status(401).end(); }
});

router.put('/me', (req, res) => {
  try {
    const token = req.cookies?.cerulea_jwt;
    if (!token) return res.status(401).end();
    const payload = jwt.verify(token, JWT_SECRET);
    const user = Array.from(users.values()).find(u => u.id === String(payload.sub));
    if (!user) return res.status(401).end();
    const { name } = req.body || {};
    user.name = name ?? user.name;
    res.json({ id: user.id, email: user.email, name: user.name });
  } catch { return res.status(401).end(); }
});

router.post('/forgot', (req, res) => res.json({ ok: true }));
router.post('/reset', (req, res) => res.json({ ok: true }));

module.exports = router;
