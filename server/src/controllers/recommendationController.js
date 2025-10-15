import pool from '../config/db.js';
import {
  seedMoviesOutsideFavoriteGenres,
  seedMoviesForGenres,
  ensureTrendingSeed
} from '../services/tmdbService.js';

export async function getRecommendations(req, res) {
  try {
    const [genreRows] = await pool.query(
      `SELECT m.genre, AVG(r.rating) AS avg_rating, COUNT(*) AS total_ratings
       FROM ratings r
       INNER JOIN movies m ON m.id = r.movie_id
       WHERE r.user_id = ?
       GROUP BY m.genre
       HAVING total_ratings >= 1
       ORDER BY avg_rating DESC, total_ratings DESC
       LIMIT 3;`,
      [req.user.id]
    );

    if (genreRows.length === 0) {
      return res.status(400).json({
        message: 'Not enough ratings to generate recommendations. Please rate more movies.',
        recommendations: []
      });
    }

  const favoriteGenres = genreRows.map((row) => row.genre);

  await seedMoviesOutsideFavoriteGenres(favoriteGenres, { genresToPick: 3, moviesPerGenre: 8 });

  const placeholders = favoriteGenres.map(() => '?').join(',');

    const params = [req.user.id];
    let genreCondition = '';

    if (favoriteGenres.length > 0) {
      params.push(...favoriteGenres);
      genreCondition = `AND m.genre NOT IN (${placeholders})`;
    }

    let [recommendations] = await pool.query(
      `SELECT m.*
       FROM movies m
       LEFT JOIN ratings r ON r.movie_id = m.id AND r.user_id = ?
       WHERE r.id IS NULL
         ${genreCondition}
         AND m.critic_rating > 8
       ORDER BY m.critic_rating DESC, m.release_year DESC
       LIMIT 20;`,
      params
    );

    if (recommendations.length === 0) {
      await seedMoviesForGenres({ genresToPick: 5, moviesPerGenre: 6 });
      const [fallback] = await pool.query(
        `SELECT m.*
         FROM movies m
         LEFT JOIN ratings r ON r.movie_id = m.id AND r.user_id = ?
         WHERE r.id IS NULL
           AND m.critic_rating > 7
         ORDER BY m.critic_rating DESC, m.release_year DESC
         LIMIT 20;`,
        [req.user.id]
      );
      recommendations = fallback;
    }

    if (recommendations.length === 0) {
      await ensureTrendingSeed(20);
      const [trendingFallback] = await pool.query(
        `SELECT m.*
         FROM movies m
         LEFT JOIN ratings r ON r.movie_id = m.id AND r.user_id = ?
         WHERE r.id IS NULL
         ORDER BY m.critic_rating DESC, m.release_year DESC
         LIMIT 20;`,
        [req.user.id]
      );
      recommendations = trendingFallback;
    }

    return res.status(200).json({ favoriteGenres, recommendations });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to generate recommendations', error: error.message });
  }
}
