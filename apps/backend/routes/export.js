const express = require('express');
const path = require('path');
const archiver = require('archiver');
const fs = require('fs');

const router = express.Router();

router.get('/:slug', (req, res) => {
  const slug = req.params.slug;
  const folderPath = path.join(__dirname, '..', 'deployed-apps', slug);

  if (!fs.existsSync(folderPath)) {
    return res.status(404).json({ error: 'App not found' });
  }

  res.setHeader('Content-Disposition', `attachment; filename=${slug}.zip`);
  res.setHeader('Content-Type', 'application/zip');

  const archive = archiver('zip');
  archive.pipe(res);
  archive.directory(folderPath, false);
  archive.finalize();
});

module.exports = router;
