const express = require('express');
const crypto = require('crypto');
const { pool } = require('../db');

const router = express.Router();

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const APP_URL = process.env.APP_URL || 'https://mama-production-fb99.up.railway.app';

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const result = await pool.query('SELECT id, name FROM users WHERE email = $1', [email.toLowerCase()]);

    // Always return success to prevent email enumeration
    if (result.rows.length === 0) {
      return res.json({ success: true, message: 'If an account exists, a reset link has been sent.' });
    }

    const user = result.rows[0];
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Store reset token
    await pool.query(
      `INSERT INTO password_resets (user_id, token, expires_at)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id) DO UPDATE SET token = $2, expires_at = $3, used = false`,
      [user.id, token, expiresAt]
    );

    // Send email via Resend
    if (RESEND_API_KEY) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'mama. <noreply@yourdomain.com>',
          to: email.toLowerCase(),
          subject: 'Reset your mama. password',
          html: `
            <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
              <h1 style="font-size: 28px; font-weight: 800; color: #000; margin-bottom: 4px;">mama<span style="color: #FF193B;">.</span></h1>
              <p style="color: #666; margin-bottom: 32px;">Good food shouldn't be a hard decision.</p>
              <p style="font-size: 16px; color: #000; margin-bottom: 8px;">Hi ${user.name || 'there'},</p>
              <p style="font-size: 15px; color: #444; line-height: 1.6; margin-bottom: 32px;">
                You requested a password reset. Click the button below to set a new password. This link expires in 1 hour.
              </p>
              <a href="${APP_URL}/api/auth/reset-password?token=${token}"
                 style="display: inline-block; background: #FF193B; color: #fff; padding: 14px 28px; border-radius: 24px; text-decoration: none; font-weight: 700; font-size: 15px;">
                Reset Password
              </a>
              <p style="font-size: 13px; color: #999; margin-top: 32px;">
                If you didn't request this, ignore this email. Your password won't change.
              </p>
            </div>
          `,
        }),
      });
    }

    return res.json({ success: true, message: 'If an account exists, a reset link has been sent.' });
  } catch (err) {
    console.error('Forgot password error:', err);
    return res.status(500).json({ error: 'Failed to process request' });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ error: 'Token and password are required' });
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

    const result = await pool.query(
      `SELECT pr.user_id FROM password_resets pr
       WHERE pr.token = $1 AND pr.expires_at > NOW() AND pr.used = false`,
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Reset link is invalid or has expired' });
    }

    const { user_id } = result.rows[0];
    const bcrypt = require('bcryptjs');
    const passwordHash = await bcrypt.hash(password, 12);

    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, user_id]);
    await pool.query('UPDATE password_resets SET used = true WHERE user_id = $1', [user_id]);

    return res.json({ success: true, message: 'Password updated successfully' });
  } catch (err) {
    console.error('Reset password error:', err);
    return res.status(500).json({ error: 'Failed to reset password' });
  }
});

module.exports = router;
