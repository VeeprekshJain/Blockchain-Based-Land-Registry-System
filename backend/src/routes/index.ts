/**
 * routes/index.ts — API router aggregator.
 * Feature routers will be mounted here as they are implemented.
 */
import { Router } from 'express';
import landRouter from './landRoutes';
import fraudRouter from './fraudRoutes';
import devAuthRouter from './devAuthRoutes';

export const apiRouter = Router();

// ─── API status ───────────────────────────────────────────────────────────────
apiRouter.get('/', (_req, res) => {
  res.json({
    success: true,
    message: 'Land Registry API v1',
    version: '1.0.0',
    endpoints: {
      health: 'GET /health',
      lands: '/api/v1/lands',
      fraud: '/api/v1/fraud',
      auth: '/api/v1/auth (coming soon)',
      users: '/api/v1/users (coming soon)',
      transfers: '/api/v1/transfers (coming soon)',
      documents: '/api/v1/documents (coming soon)',
    },
  });
});

// ─── Feature routes ───────────────────────────────────────────────────────────
apiRouter.use('/lands', landRouter);
apiRouter.use('/fraud', fraudRouter);
apiRouter.use('/dev-auth', devAuthRouter);

// (Uncomment as other features are implemented)
// import { authRouter }      from './authRoutes';
// import { userRouter }      from './userRoutes';
// import { transferRouter }  from './transferRoutes';
// import { documentRouter }  from './documentRoutes';
// apiRouter.use('/auth',      authRouter);
// apiRouter.use('/users',     userRouter);
// apiRouter.use('/transfers', transferRouter);
// apiRouter.use('/documents', documentRouter);
