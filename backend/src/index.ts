import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import authRoutes from './routes/auth-routes';
import complaintRoutes from './routes/complaint-routes';
import projectRoutes from './routes/project-routes';
import aiRoutes from './routes/ai-routes';
import { initSlaEscalationJob } from './services/escalation-service';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Initialize Cron Jobs
initSlaEscalationJob();

// Middleware
app.use(cors({
    origin: (origin, callback) => {
        const isAllowed =
            !origin ||
            origin.includes('localhost') ||
            origin.endsWith('.vercel.app') ||
            origin === 'https://jan-connect-tawny.vercel.app' ||
            origin === process.env.ALLOWED_ORIGIN;
        if (isAllowed) {
            callback(null, true);
        } else {
            console.warn(`CORS blocked origin: ${origin}`);
            callback(new Error(`CORS blocked: ${origin}`));
        }
    },
    credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/ai', aiRoutes);

// Database check middleware
app.use('/api', (req, res, next) => {
    // Exclude health check from DB requirement
    if (req.path === '/health' || req.path === '/') {
        return next();
    }
    const state = mongoose.connection.readyState;
    // 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
    if (state !== 1 && state !== 2) {
        return res.status(503).json({
            message: 'Database is currently initializing or unreachable. Please retry in a few seconds.',
            dbState: state
        });
    }
    next();
});

// Health check with DB status
app.get('/', (_req: Request, res: Response) => {
    const states = ['Disconnected', 'Connected', 'Connecting', 'Disconnecting'];
    res.json({
        status: 'OK',
        service: 'CivicAI - JanConnect API',
        database: states[mongoose.connection.readyState] || 'Unknown',
        timestamp: new Date().toISOString()
    });
});

app.get('/api/health', (_req: Request, res: Response) => {
    const states = ['Disconnected', 'Connected', 'Connecting', 'Disconnecting'];
    res.json({
        status: 'OK',
        database: states[mongoose.connection.readyState] || 'Unknown',
        uptime: process.uptime()
    });
});

// Connect to MongoDB
const MONGODB_URI = (process.env.MONGODB_URI || '').trim();

const connectDB = async () => {
    if (!MONGODB_URI) {
        console.error('❌ MONGODB_URI is not set! Check your environment variables.');
        return;
    }

    const maskedUri = MONGODB_URI.replace(/\/\/(.*):(.*)@/, '//***:***@');
    console.log(`[DB] Attempting connection to: ${maskedUri}`);

    try {
        await mongoose.connect(MONGODB_URI, {
            serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of hanging 30s
            socketTimeoutMS: 45000,
        });
        console.log('✅ [DB] Successfully connected to MongoDB Atlas');
    } catch (error: any) {
        console.error('❌ [DB] Connection failed:', error.message);
        console.log('[DB] Retrying connection in 5 seconds...');
        setTimeout(connectDB, 5000);
    }
};

mongoose.connection.on('disconnected', () => {
    console.warn('⚠️ [DB] MongoDB disconnected. Attempting to reconnect...');
});

mongoose.connection.on('error', (err) => {
    console.error('❌ [DB] MongoDB connection error:', err.message);
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 [Server] Running on port ${PORT}`);
    console.log(`🌍 [Env] NODE_ENV=${process.env.NODE_ENV || 'development'}`);
    connectDB();
});
