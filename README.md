# The Echo Chamber Breaker

This monorepo contains the full-stack implementation of **The Echo Chamber Breaker**, a free-to-host movie recommendation platform that encourages users to explore genres outside their comfort zone.

## Project Layout

- `client/` – React + Vite frontend styled with Tailwind CSS. Built for deployment on Vercel.
- `server/` – Node.js + Express backend with a MySQL data layer. Ready for deployment on Render.
- `server/sql/schema.sql` – PlanetScale-compatible schema setup for users, movies, ratings, and watchlists.

## Getting Started Locally

1. **Install dependencies**
	```bash
	cd server && npm install
	cd ../client && npm install
	```
2. **Configure environment variables**
	- Copy `server/.env.example` to `server/.env` and fill in your PlanetScale credentials plus a `JWT_SECRET`.
	- For local development you can run PlanetScale via a proxy or point at any MySQL instance.
	- Provide TMDB credentials by adding either `TMDB_READ_ACCESS_TOKEN` (preferred) or `TMDB_API_KEY` to `server/.env`. Generate fresh keys from your TMDB dashboard.
	- Add `VITE_API_BASE_URL` to `client/.env` if the backend isn’t running on `http://localhost:4000`.
3. **Run the backend**
	```bash
	cd server
	npm run dev
	```
4. **Run the frontend**
	```bash
	cd client
	npm run dev
	```

Access the app at `http://localhost:5173`.

## Deployment Notes

- **Frontend (Vercel):** Set the `VITE_API_BASE_URL` environment variable to your Render backend URL.
- **Backend (Render):** Provide all database credentials and `JWT_SECRET` in the Render dashboard. Use Render’s build command `npm install` and start command `npm start`.
- **Database (PlanetScale):** Import `server/sql/schema.sql` to initialize tables. Ensure `FOREIGN_KEY_CHECKS=1` in your branch settings.

## Key Features

- Secure user registration and login with JWT-based authentication.
- Onboarding flow that asks users to rate at least five diverse movies pulled from multiple genres.
- Recommendation engine that excludes a user’s favorite genres and surfaces highly rated alternatives fetched live from TMDB (critic rating > 8).
- Responsive UI with Movie cards, onboarding grid, and recommendation dashboard.

## Testing Ideas

- Seed the `movies` table with diverse genres for best results.
- Verify recommendations after submitting ratings in at least three different genres.
- Confirm CORS origins via the `FRONTEND_ORIGIN` environment variable during deployment.