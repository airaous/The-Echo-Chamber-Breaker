import { fetchOnboardingMovies } from '../services/tmdbService.js';

export async function getOnboardingMovies(req, res) {
  try {
    const movies = await fetchOnboardingMovies({ total: 20 });
    return res.status(200).json({ movies });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch onboarding movies', error: error.message });
  }
}
