const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();
const { generateApp } = require('../utils/generateApp');

router.post('/', async (req, res) => {
  const studio = req.body.studio;
  const slug = studio?.appMetadata?.slug || `app-${Date.now()}`;
  const targetDir = path.join(__dirname, '..', 'deployed-apps', slug);

  try {
    await generateApp(studio, targetDir);
    res.json({ status: 'success', path: `/deployed-apps/${slug}` });
  } catch (err) {
    console.error('[DEPLOY ERROR]', err);
    res.status(500).json({ error: 'Deploy failed' });
  }
});

module.exports = router;
