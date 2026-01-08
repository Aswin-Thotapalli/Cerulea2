const express = require('express');
const authRequired = require('../middleware/authRequired');
const { getAll } = require('../utils/store');

const router = express.Router();

// GET /api/deployments -> list user's deployments
router.get('/', authRequired, (req, res) => {
  const deployments = getAll(req.userId, 'deployments');
  res.json(deployments);
});

module.exports = router;
