/**
 * routes/index.ts — API router aggregator.
 * Feature routers will be mounted here as they are implemented.
 */
import { Router } from 'express';
import landRouter from './landRoutes';

export const apiRouter = Router();

// ─── API status ───────────────────────────────────────────────────────────────
apiRouter.get('/', (_req, res) => {
  res.json({
    success: true,
    message: 'Land Registry API v1',
    version: '1.0.0',
    endpoints: {
      health: 'GET /health',
      auth: '/api/v1/auth',
      users: '/api/v1/users',
      lands: '/api/v1/lands',
      transfers: '/api/v1/transfers',
      documents: '/api/v1/documents',
    },
  });
});

// ─── Feature routes ───────────────────────────────────────────────────────────
apiRouter.use('/lands', landRouter);

// (Uncomment as other features are implemented)
// import { authRouter }      from './authRoutes';
// import { userRouter }      from './userRoutes';
// import { transferRouter }  from './transferRoutes';
// import { documentRouter }  from './documentRoutes';
// apiRouter.use('/auth',      authRouter);
// apiRouter.use('/users',     userRouter);
// apiRouter.use('/transfers', transferRouter);
// apiRouter.use('/documents', documentRouter);
