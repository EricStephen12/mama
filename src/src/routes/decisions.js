const express = require('express');
const { pool } = require('../db');
const { requireAuth } = require('../middleware');

const router = express.Router();

// POST /api/decisions — log a swipe
router.post('/', requireAuth, async (req, res) => {
  try {
    const { meal_id, meal_name, action, budget_tier } = req.body;
    if (!meal_id || !meal_name || !action) {
      return res.status(400).json({ error: 'meal_id, meal_name and action are required' });
    }
    await pool.query(
      'INSERT INTO decisions (user_id, meal_id, meal_name, action, budget_tier) VALUES ($1, $2, $3, $4, $5)',
      [req.userId, meal_id, meal_name, action, budget_tier || null]
    );
    return res.json({ success: true });
  } catch (err) {
    console.error('Log decision error:', err);
    return res.status(500).json({ error: 'Failed to log decision' });
  }
});

// GET /api/decisions — fetch user history
router.get('/', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM decisions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100',
      [req.userId]
    );
    return res.json(result.rows);
  } catch (err) {
    console.error('Get decisions error:', err);
    return res.status(500).json({ error: 'Failed to fetch decisions' });
  }
});

// POST /api/saved — save accepted meal
router.post('/saved', requireAuth, async (req, res) => {
  try {
    const { meal_id, meal_name } = req.body;
    if (!meal_id || !meal_name) {
      return res.status(400).json({ error: 'meal_id and meal_name are required' });
    }
    await pool.query(
      'INSERT INTO saved_meals (user_id, meal_id, meal_name) VALUES ($1, $2, $3) ON CONFLICT (user_id, meal_id) DO NOTHING',
      [req.userId, meal_id, meal_name]
    );
    return res.json({ success: true });
  } catch (err) {
    console.error('Save meal error:', err);
    return res.status(500).json({ error: 'Failed to save meal' });
  }
});

// GET /api/saved — get saved meals
router.get('/saved', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM saved_meals WHERE user_id = $1 ORDER BY saved_at DESC',
      [req.userId]
    );
    return res.json(result.rows);
  } catch (err) {
    console.error('Get saved meals error:', err);
    return res.status(500).json({ error: 'Failed to fetch saved meals' });
  }
});

module.exports = router;
