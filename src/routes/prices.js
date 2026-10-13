const express = require('express');
const { pool } = require('../db');
const { requireAuth } = require('../middleware');

const router = express.Router();

// GET /api/prices?city=Lagos — get known prices for a city
router.get('/', requireAuth, async (req, res) => {
  try {
    const city = req.query.city || 'Lagos';
    const result = await pool.query(
      `SELECT name, price_per_unit, unit, confirmed, confirm_count
       FROM ingredient_prices WHERE city = $1
       ORDER BY name`,
      [city]
    );
    return res.json(result.rows);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch prices' });
  }
});

// POST /api/prices/correct — user corrects a price
router.post('/correct', requireAuth, async (req, res) => {
  try {
    const { name, city, price_per_unit, unit } = req.body;

    if (!name || !price_per_unit) {
      return res.status(400).json({ error: 'name and price_per_unit required' });
    }

    await pool.query(
      `INSERT INTO ingredient_prices (name, city, price_per_unit, unit, confirmed, confirm_count, last_confirmed_at)
       VALUES ($1, $2, $3, $4, true, 1, NOW())
       ON CONFLICT (name, city) DO UPDATE SET
         price_per_unit = CASE
           WHEN ingredient_prices.confirm_count = 0 THEN $3
           ELSE ROUND((ingredient_prices.price_per_unit * ingredient_prices.confirm_count + $3) / (ingredient_prices.confirm_count + 1))
         END,
         unit = COALESCE($4, ingredient_prices.unit),
         confirmed = true,
         confirm_count = ingredient_prices.confirm_count + 1,
         last_confirmed_at = NOW()`,
      [name.toLowerCase().trim(), city || 'Lagos', price_per_unit, unit || 'piece']
    );

    return res.json({ success: true });
  } catch (err) {
    console.error('Correct price error:', err);
    return res.status(500).json({ error: 'Failed to update price' });
  }
});

module.exports = router;
