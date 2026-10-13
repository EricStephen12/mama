const express = require('express');
const cors = require('cors');
const { initDB } = require('./db');

const authRoutes = require('./routes/auth');
const forgotRoutes = require('./routes/forgot');
const profileRoutes = require('./routes/profile');
const historyRoutes = require('./routes/history');
const mealsRoutes = require('./routes/meals');
const pricesRoutes = require('./routes/prices');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'ok', app: 'mama-backend', version: '2.0.0' });
});

// Auth
app.use('/api/auth', authRoutes);
app.use('/api/auth', forgotRoutes);

// Profile
app.use('/api/profile', profileRoutes);

// Mama Kitchen — new
app.use('/api/history', historyRoutes);
app.use('/api/meals', mealsRoutes);
app.use('/api/prices', pricesRoutes);

// Start
initDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Mama Kitchen backend v2 running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to init DB:', err);
    process.exit(1);
  });
