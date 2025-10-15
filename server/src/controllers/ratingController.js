import pool from '../config/db.js';

export async function submitRating(req, res) {
  const { movieId, rating } = req.body;
  if (!movieId || !rating) {
    return res.status(400).json({ message: 'movieId and rating are required' });
  }

  const numericRating = Number(rating);
  if (Number.isNaN(numericRating) || numericRating < 1 || numericRating > 5) {
    return res.status(400).json({ message: 'Rating must be a number between 1 and 5' });
  }

  try {
    await pool.query(
      `INSERT INTO ratings (user_id, movie_id, rating)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE rating = VALUES(rating)`,
      [req.user.id, movieId, numericRating]
    );
    return res.status(201).json({ message: 'Rating saved' });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to save rating', error: error.message });
  }
}
