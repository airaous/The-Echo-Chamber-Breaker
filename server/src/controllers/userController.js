import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../config/db.js';

const PASSWORD_SALT_ROUNDS = 10;
export async function registerUser(req, res) {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required' });
  }

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    return res.status(500).json({ message: 'JWT secret is not configured' });
  }

  try {
    const [[existingUser]] = await pool.query('SELECT id FROM users WHERE username = ?', [username]);
    if (existingUser) {
      return res.status(409).json({ message: 'Username already taken' });
    }

    const hashedPassword = await bcrypt.hash(password, PASSWORD_SALT_ROUNDS);
    const [result] = await pool.query(
      'INSERT INTO users (username, password) VALUES (?, ?)',
      [username, hashedPassword]
    );

    const token = jwt.sign({ sub: result.insertId, username }, jwtSecret, { expiresIn: '7d' });

    return res.status(201).json({ token });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to register user', error: error.message });
  }
}

export async function loginUser(req, res) {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required' });
  }

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    return res.status(500).json({ message: 'JWT secret is not configured' });
  }

  try {
    const [[user]] = await pool.query('SELECT id, password FROM users WHERE username = ?', [username]);
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({ sub: user.id, username }, jwtSecret, { expiresIn: '7d' });

    return res.status(200).json({ token });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to log in', error: error.message });
  }
}
