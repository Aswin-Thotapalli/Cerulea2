const express = require('express');
const authRequired = require('../middleware/authRequired');
const { getAll, upsertById, genId, putAll } = require('../utils/store');

const router = express.Router();

// GET /api/apps -> list user's apps
router.get('/', authRequired, (req, res) => {
  const apps = getAll(req.userId, 'apps');
  res.json(apps);
});

// POST /api/apps -> create app {name}
router.post('/', authRequired, (req, res) => {
  const { name } = req.body || {};
  if (!name) return res.status(400).json({ message: 'name required' });
  const app = {
    id: genId('app'),
    userId: req.userId,
    name,
    slug: name.toLowerCase().replace(/\s+/g, '-'),
    status: 'Draft',
    env: null,
    meta: {},
  };
  const list = getAll(req.userId, 'apps');
  list.push({ ...app, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
  putAll(req.userId, 'apps', list);
  res.json(app);
});

// PUT /api/apps/:id -> update (status, meta, name, env)
router.put('/:id', authRequired, (req, res) => {
  const { id } = req.params;
  const payload = { ...req.body, id };
  upsertById(req.userId, 'apps', payload);
  res.json(payload);
});

module.exports = router;
