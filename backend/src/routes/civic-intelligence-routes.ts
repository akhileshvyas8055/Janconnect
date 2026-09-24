import express, { NextFunction, Request, RequestHandler, Response, Router } from 'express';
import { authenticate, authorize } from '../middleware/auth-middleware';
import { UserRole } from '../models/user-model';
import { MAX_CSV_BYTES } from '../services/civic-ingestion-service';
import { analyzeDataset, getCivicDatasets, getDatasetAnalysis, processDatasetUpload } from '../controllers/civic-intelligence-controller';

const router = Router();
const parseCsvText = express.text({
    type: ['text/csv', 'application/csv', 'text/plain'],
    limit: MAX_CSV_BYTES,
});

const requireCsvContentType: RequestHandler = (req, res, next) => {
    const contentType = req.header('content-type')?.split(';')[0].trim().toLowerCase();
    if (!contentType || !['text/csv', 'application/csv', 'text/plain'].includes(contentType)) {
        return res.status(415).json({ message: 'Upload CSV file content using a text/csv request.' });
    }
    next();
};

const parseCsvWithSafeErrors: RequestHandler = (req: Request, res: Response, next: NextFunction) => {
    parseCsvText(req, res, (error?: unknown) => {
        if (!error) return next();
        const parserError = error as { type?: string };
        if (parserError.type === 'entity.too.large') {
            return res.status(413).json({ message: `CSV exceeds the maximum file size (${MAX_CSV_BYTES} bytes).` });
        }
        return res.status(400).json({ message: 'Unable to read CSV request body.' });
    });
};

// Dataset ingestion is restricted to staff roles and uses the existing JWT + authorize middleware.
router.post(
    '/dataset',
    authenticate,
    authorize([UserRole.OFFICER, UserRole.ADMIN, UserRole.HIGHER_AUTHORITY]),
    requireCsvContentType,
    parseCsvWithSafeErrors,
    processDatasetUpload,
);

router.get(
    '/datasets',
    authenticate,
    authorize([UserRole.OFFICER, UserRole.ADMIN, UserRole.HIGHER_AUTHORITY]),
    getCivicDatasets,
);

router.get(
    '/datasets/:datasetId',
    authenticate,
    authorize([UserRole.OFFICER, UserRole.ADMIN, UserRole.HIGHER_AUTHORITY]),
    getDatasetAnalysis,
);

router.post(
    '/analyze/:datasetId',
    authenticate,
    authorize([UserRole.OFFICER, UserRole.ADMIN, UserRole.HIGHER_AUTHORITY]),
    analyzeDataset,
);

export default router;
