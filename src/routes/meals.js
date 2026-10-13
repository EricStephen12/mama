const express = require('express');
const { pool } = require('../db');
const { requireAuth } = require('../middleware');

const router = express.Router();

// POST /api/meals — save a generated meal
router.post('/', requireAuth, async (req, res) => {
  try {
    const {
      title, meal_time, budget, total_cost, serves,
      calories, protein_g, carbs_g, fat_g,
      balance_protein, balance_carbs, balance_vegetables, balance_fix,
      reason, ingredients, steps, city, groq_raw,
    } = req.body;

    const result = await pool.query(
      `INSERT INTO generated_meals
        (user_id, title, meal_time, budget, total_cost, serves,
         calories, protein_g, carbs_g, fat_g,
         balance_protein, balance_carbs, balance_vegetables, balance_fix,
         reason, ingredients, steps, city, groq_raw)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
       RETURNING id`,
      [
        req.userId, title, meal_time, budget, total_cost, serves || 1,
        calories, protein_g, carbs_g, fat_g,
        balance_protein, balance_carbs, balance_vegetables, balance_fix,
        reason, JSON.stringify(ingredients), JSON.stringify(steps),
        city || 'Lagos', JSON.stringify(groq_raw),
      ]
    );

    return res.status(201).json({ id: result.rows[0].id });
  } catch (err) {
    console.error('Save meal error:', err);
    return res.status(500).json({ error: 'Failed to save meal' });
  }
});

// GET /api/meals/recent — last 20 meals for context
router.get('/recent', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, title, meal_time, total_cost, cooked_count, created_at
       FROM generated_meals
       WHERE user_id = $1
       ORDER BY created_at DESC LIMIT 20`,
      [req.userId]
    );
    return res.json(result.rows);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch meals' });
  }
});

module.exports = router;
