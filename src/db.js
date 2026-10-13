const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function initDB() {
  await pool.query(`
    -- ── Existing tables ──────────────────────────────────────────────────────

    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email TEXT UNIQUE NOT NULL,
      name TEXT,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS profiles (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE NOT NULL,
      cuisines TEXT[] DEFAULT '{}',
      restrictions TEXT[] DEFAULT '{}',
      dislikes TEXT[] DEFAULT '{}',
      default_budget TEXT DEFAULT 'standard',
      liked_ingredients TEXT[] DEFAULT '{}',
      -- New: budget per meal time (morning/afternoon/evening)
      budget_morning INTEGER DEFAULT 0,
      budget_afternoon INTEGER DEFAULT 0,
      budget_evening INTEGER DEFAULT 0,
      -- New: household
      household_size INTEGER DEFAULT 1,
      -- New: staples user always has at home
      pantry_staples TEXT[] DEFAULT '{}',
      city TEXT DEFAULT 'Lagos',
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS password_resets (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE NOT NULL,
      token TEXT NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      used BOOLEAN DEFAULT false,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- ── New: Mama Kitchen tables ──────────────────────────────────────────────

    -- Every meal Groq generates (cached per user + city + budget + meal_time)
    CREATE TABLE IF NOT EXISTS generated_meals (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
      title TEXT NOT NULL,
      meal_time TEXT NOT NULL CHECK (meal_time IN ('morning', 'afternoon', 'evening')),
      budget INTEGER NOT NULL,
      total_cost INTEGER NOT NULL,
      serves INTEGER NOT NULL DEFAULT 1,
      calories INTEGER,
      protein_g NUMERIC(6,1),
      carbs_g NUMERIC(6,1),
      fat_g NUMERIC(6,1),
      balance_protein BOOLEAN DEFAULT false,
      balance_carbs BOOLEAN DEFAULT false,
      balance_vegetables BOOLEAN DEFAULT false,
      balance_fix TEXT,
      reason TEXT,
      ingredients JSONB NOT NULL DEFAULT '[]',
      steps JSONB NOT NULL DEFAULT '[]',
      city TEXT DEFAULT 'Lagos',
      groq_raw JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Ingredient prices per city — estimated until confirmed by users
    CREATE TABLE IF NOT EXISTS ingredient_prices (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      city TEXT NOT NULL DEFAULT 'Lagos',
      price_per_unit INTEGER NOT NULL,
      unit TEXT NOT NULL DEFAULT 'piece',
      confirmed BOOLEAN DEFAULT false,
      confirm_count INTEGER DEFAULT 0,
      last_confirmed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(name, city)
    );

    -- History: meals a user cooked
    CREATE TABLE IF NOT EXISTS history_cooked (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
      meal_id UUID REFERENCES generated_meals(id) ON DELETE SET NULL,
      title TEXT NOT NULL,
      cost_spent INTEGER,
      meal_time TEXT,
      city TEXT DEFAULT 'Lagos',
      cooked_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- History: meals a user skipped (Another one)
    CREATE TABLE IF NOT EXISTS history_skipped (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
      meal_id UUID REFERENCES generated_meals(id) ON DELETE SET NULL,
      title TEXT NOT NULL,
      skip_count INTEGER DEFAULT 1,
      last_skipped_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(user_id, title)
    );

    -- History: daily spend per user per meal time
    CREATE TABLE IF NOT EXISTS history_spend (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
      date DATE NOT NULL DEFAULT CURRENT_DATE,
      meal_time TEXT NOT NULL,
      amount_spent INTEGER NOT NULL,
      UNIQUE(user_id, date, meal_time)
    );

    -- History: pantry items user unticked as "already have"
    CREATE TABLE IF NOT EXISTS history_pantry (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
      ingredient_name TEXT NOT NULL,
      city TEXT DEFAULT 'Lagos',
      last_seen_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(user_id, ingredient_name)
    );

    -- ── Indexes ──────────────────────────────────────────────────────────────

    CREATE INDEX IF NOT EXISTS idx_generated_meals_user ON generated_meals(user_id);
    CREATE INDEX IF NOT EXISTS idx_generated_meals_city ON generated_meals(city);
    CREATE INDEX IF NOT EXISTS idx_ingredient_prices_city ON ingredient_prices(city);
    CREATE INDEX IF NOT EXISTS idx_history_cooked_user ON history_cooked(user_id);
    CREATE INDEX IF NOT EXISTS idx_history_skipped_user ON history_skipped(user_id);
    CREATE INDEX IF NOT EXISTS idx_history_spend_user ON history_spend(user_id);
    CREATE INDEX IF NOT EXISTS idx_history_pantry_user ON history_pantry(user_id);
  `);

  console.log('Database tables ready');
}

module.exports = { pool, initDB };
