import { Router } from 'express';
import { submitRating } from '../controllers/ratingController.js';
import authenticate from '../middleware/auth.js';

const router = Router();

router.post('/', authenticate, submitRating);

export default router;
