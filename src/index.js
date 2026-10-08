const express = require('express');
const cors = require('cors');
const { initDB } = require('./db');

const authRoutes = require('./routes/auth');
const profileRoutes = require('./routes/profile');
const decisionRoutes = require('./routes/decisions');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'ok', app: 'mama-backend', version: '1.0.0' });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/decisions', decisionRoutes);
app.use('/api/saved', (req, res, next) => {
  // redirect /api/saved to decisions router saved endpoints
  req.url = '/saved' + req.url;
  decisionRoutes(req, res, next);
});

// Start
initDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Mama backend running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to init DB:', err);
    process.exit(1);
  });
