const express = require('express');
const { pool } = require('../db');
const { requireAuth } = require('../middleware');

const router = express.Router();

// POST /api/history/cooked — user tapped "I cooked it"
router.post('/cooked', requireAuth, async (req, res) => {
  try {
    const { meal_id, title, cost_spent, meal_time, city } = req.body;

    await pool.query(
      `INSERT INTO history_cooked (user_id, meal_id, title, cost_spent, meal_time, city)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [req.userId, meal_id || null, title, cost_spent || 0, meal_time || null, city || 'Lagos']
    );

    // Also record spend
    if (cost_spent && meal_time) {
      await pool.query(
        `INSERT INTO history_spend (user_id, date, meal_time, amount_spent)
         VALUES ($1, CURRENT_DATE, $2, $3)
         ON CONFLICT (user_id, date, meal_time)
         DO UPDATE SET amount_spent = history_spend.amount_spent + $3`,
        [req.userId, meal_time, cost_spent]
      );
    }

    return res.json({ success: true });
  } catch (err) {
    console.error('Save cooked error:', err);
    return res.status(500).json({ error: 'Failed to save' });
  }
});

// POST /api/history/skipped — user tapped "Another one"
router.post('/skipped', requireAuth, async (req, res) => {
  try {
    const { meal_id, title } = req.body;

    await pool.query(
      `INSERT INTO history_skipped (user_id, meal_id, title, skip_count, last_skipped_at)
       VALUES ($1, $2, $3, 1, NOW())
       ON CONFLICT (user_id, title)
       DO UPDATE SET
         skip_count = history_skipped.skip_count + 1,
         last_skipped_at = NOW()`,
      [req.userId, meal_id || null, title]
    );

    return res.json({ success: true });
  } catch (err) {
    console.error('Save skipped error:', err);
    return res.status(500).json({ error: 'Failed to save' });
  }
});

// POST /api/history/pantry — user unticked "already have"
router.post('/pantry', requireAuth, async (req, res) => {
  try {
    const { ingredients, city } = req.body; // array of ingredient names

    if (!ingredients || !Array.isArray(ingredients)) {
      return res.status(400).json({ error: 'ingredients array required' });
    }

    for (const name of ingredients) {
      await pool.query(
        `INSERT INTO history_pantry (user_id, ingredient_name, city, last_seen_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (user_id, ingredient_name)
         DO UPDATE SET last_seen_at = NOW(), city = $3`,
        [req.userId, name.toLowerCase().trim(), city || 'Lagos']
      );
    }

    return res.json({ success: true });
  } catch (err) {
    console.error('Save pantry error:', err);
    return res.status(500).json({ error: 'Failed to save pantry' });
  }
});

// GET /api/history/summary — for home screen context
router.get('/summary', requireAuth, async (req, res) => {
  try {
    const [cooked, skipped, spend, pantry] = await Promise.all([
      // Last 10 cooked meals
      pool.query(
        `SELECT title, meal_time, cost_spent, cooked_at
         FROM history_cooked WHERE user_id = $1
         ORDER BY cooked_at DESC LIMIT 10`,
        [req.userId]
      ),
      // Most skipped titles
      pool.query(
        `SELECT title, skip_count FROM history_skipped
         WHERE user_id = $1 ORDER BY skip_count DESC LIMIT 10`,
        [req.userId]
      ),
      // Spend this week
      pool.query(
        `SELECT meal_time, SUM(amount_spent) as total
         FROM history_spend
         WHERE user_id = $1 AND date >= CURRENT_DATE - 7
         GROUP BY meal_time`,
        [req.userId]
      ),
      // Pantry staples
      pool.query(
        `SELECT ingredient_name FROM history_pantry
         WHERE user_id = $1 ORDER BY last_seen_at DESC LIMIT 30`,
        [req.userId]
      ),
    ]);

    return res.json({
      cooked: cooked.rows,
      skipped: skipped.rows,
      spend: spend.rows,
      pantry: pantry.rows.map((r) => r.ingredient_name),
    });
  } catch (err) {
    console.error('History summary error:', err);
    return res.status(500).json({ error: 'Failed to fetch history' });
  }
});

// GET /api/history/all — full history screen
router.get('/all', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT title, meal_time, cost_spent, cooked_at
       FROM history_cooked WHERE user_id = $1
       ORDER BY cooked_at DESC LIMIT 50`,
      [req.userId]
    );
    return res.json(result.rows);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch history' });
  }
});

// DELETE /api/history/clear — user clears their history from settings
router.delete('/clear', requireAuth, async (req, res) => {
  try {
    await Promise.all([
      pool.query('DELETE FROM history_cooked WHERE user_id = $1', [req.userId]),
      pool.query('DELETE FROM history_skipped WHERE user_id = $1', [req.userId]),
      pool.query('DELETE FROM history_spend WHERE user_id = $1', [req.userId]),
      pool.query('DELETE FROM history_pantry WHERE user_id = $1', [req.userId]),
    ]);
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to clear history' });
  }
});

module.exports = router;
