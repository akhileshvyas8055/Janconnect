import { Router } from 'express';
import {
    getAllProjects,
    getProjectById,
    getProjectReviews,
    createProject,
    updateProjectStatus,
    rateProject
} from '../controllers/project-controller';
import { authenticate } from '../middleware/auth-middleware';

const router = Router();

router.get('/', getAllProjects); // Publicly viewable
router.get('/:id', getProjectById); // Publicly viewable project details
router.get('/:id/reviews', getProjectReviews); // Publicly viewable reviews
router.post('/', authenticate, createProject); // Officers / Admins can create
router.patch('/:id/status', authenticate, updateProjectStatus); // Authorized department Officer / Admin
router.patch('/:id/rate', authenticate, rateProject); // Authenticated users can rate/review

export default router;
