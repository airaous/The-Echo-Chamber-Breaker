import { Router } from 'express';
import { getOnboardingMovies } from '../controllers/movieController.js';
import authenticate from '../middleware/auth.js';

const router = Router();

router.get('/onboarding', authenticate, getOnboardingMovies);

export default router;
