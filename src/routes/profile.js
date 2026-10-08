const express = require('express');
const { pool } = require('../db');
const { requireAuth } = require('../middleware');

const router = express.Router();

// GET /api/profile
router.get('/', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM profiles WHERE user_id = $1',
      [req.userId]
    );
    if (result.rows.length === 0) {
      return res.json({ cuisines: [], restrictions: [], dislikes: [], default_budget: 'standard' });
    }
    return res.json(result.rows[0]);
  } catch (err) {
    console.error('Get profile error:', err);
    return res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// PUT /api/profile
router.put('/', requireAuth, async (req, res) => {
  try {
    const { cuisines, restrictions, dislikes, default_budget, liked_ingredients } = req.body;

    await pool.query(
      `INSERT INTO profiles (user_id, cuisines, restrictions, dislikes, default_budget, liked_ingredients, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       ON CONFLICT (user_id) DO UPDATE SET
         cuisines = EXCLUDED.cuisines,
         restrictions = EXCLUDED.restrictions,
         dislikes = EXCLUDED.dislikes,
         default_budget = EXCLUDED.default_budget,
         liked_ingredients = EXCLUDED.liked_ingredients,
         updated_at = NOW()`,
      [
        req.userId,
        cuisines || [],
        restrictions || [],
        dislikes || [],
        default_budget || 'standard',
        liked_ingredients || [],
      ]
    );

    return res.json({ success: true });
  } catch (err) {
    console.error('Update profile error:', err);
    return res.status(500).json({ error: 'Failed to update profile' });
  }
});

module.exports = router;
