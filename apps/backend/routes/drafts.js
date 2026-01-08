const express = require('express');
const authRequired = require('../middleware/authRequired');
const { getAll, upsertById, genId, putAll } = require('../utils/store');

const router = express.Router();

// GET /api/drafts -> list user's drafts
router.get('/', authRequired, (req, res) => {
  const drafts = getAll(req.userId, 'drafts');
  res.json(drafts);
});

// POST /api/drafts/upsert -> upsert {id?, appId?, step, payload}
router.post('/upsert', authRequired, (req, res) => {
  const { id, appId, step, payload } = req.body || {};
  if (!step) return res.status(400).json({ message: 'step required' });
  const draft = {
    id: id || genId('draft'),
    userId: req.userId,
    appId: appId || null,
    step,
    payload: payload || {},
  };
  upsertById(req.userId, 'drafts', draft);
  res.json(draft);
});

// POST /api/drafts/attach -> attach draft to appId
router.post('/attach', authRequired, (req, res) => {
  const { draftId, appId } = req.body || {};
  if (!draftId || !appId) return res.status(400).json({ message: 'draftId and appId required' });
  const drafts = getAll(req.userId, 'drafts');
  const idx = drafts.findIndex(d => d.id === draftId);
  if (idx === -1) return res.status(404).json({ message: 'draft not found' });
  drafts[idx].appId = appId;
  drafts[idx].updatedAt = new Date().toISOString();
  putAll(req.userId, 'drafts', drafts);
  res.json(drafts[idx]);
});

module.exports = router;
