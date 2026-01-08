const express = require('express');
const router = express.Router();

// In-memory store for now
const inMemoryStore = {};

router.post('/', (req, res) => {
  const { slug } = req.body?.appMetadata || {};
  if (!slug) {
    return res.status(400).json({ error: 'Missing appMetadata.slug' });
  }

  inMemoryStore[slug] = req.body;
  console.log(`[SAVE] Stored app: ${slug}`);

  res.json({ status: 'success', savedSlug: slug });
});

module.exports = router;
