// apps/backend/index.js
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const path = require('path');

const saveRoutes = require('./routes/save');
const deployRoutes = require('./routes/deploy');
const exportRoutes = require('./routes/export');
const authRoutes = require('./routes/auth');

const appsRoutes = require('./routes/apps');
const draftsRoutes = require('./routes/drafts');
const deploymentsRoutes = require('./routes/deployments');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cookieParser());
app.use(bodyParser.json());

app.use(cors({
  origin: ['http://localhost:3000', 'https://studio.cerulea.app'],
  credentials: true,
}));

// Auth + new APIs
app.use('/api/auth', authRoutes);
app.use('/api/apps', appsRoutes);
app.use('/api/drafts', draftsRoutes);
app.use('/api/deployments', deploymentsRoutes);

// Existing routes (optionally prefix these too later)
app.use('/api/save', saveRoutes);
app.use('/api/deploy', deployRoutes);
app.use('/api/export', exportRoutes);

// Static (future)
app.use('/deployed-apps', express.static(path.join(__dirname, 'deployed-apps')));

app.listen(PORT, () => {
  console.log(`Cerulea Backend running at http://localhost:${PORT}`);
});
