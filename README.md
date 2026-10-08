# Mama Backend

Express.js + PostgreSQL API for the Mama food decision app.

## Environment Variables

Set these in Railway:

```
DATABASE_URL=postgresql://...  (Railway provides this automatically)
JWT_SECRET=your-random-secret-string-here
NODE_ENV=production
PORT=3001
```

## Endpoints

- `GET /` — health check
- `POST /api/auth/register` — create account
- `POST /api/auth/login` — sign in
- `GET /api/profile` — get taste profile
- `PUT /api/profile` — update taste profile
- `POST /api/decisions` — log a swipe
- `GET /api/decisions` — get swipe history
- `POST /api/saved` — save an accepted meal
- `GET /api/saved` — get saved meals

## Deploy to Railway

1. Push this `backend/` folder to its own GitHub repo
2. Create a new Railway project
3. Add a PostgreSQL database service
4. Add a Node.js service pointing to the repo
5. Set environment variables above
6. Railway auto-deploys on every push
