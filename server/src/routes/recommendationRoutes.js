import { Router } from 'express';
import { getRecommendations } from '../controllers/recommendationController.js';
import authenticate from '../middleware/auth.js';

const router = Router();

router.get('/', authenticate, getRecommendations);

export default router;
