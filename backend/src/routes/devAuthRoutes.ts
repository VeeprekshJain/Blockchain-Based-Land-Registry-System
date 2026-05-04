import { Router } from 'express';
import jwt from 'jsonwebtoken';

import { config } from '../config';
import { ApiResponse } from '../utils/ApiResponse';

const devAuthRouter = Router();

devAuthRouter.get('/token', (_req, res) => {
  if (!config.isDevelopment) {
    res.status(403).json(ApiResponse.error('Dev token endpoint is only available in development'));
    return;
  }

  const token = jwt.sign(
    {
      sub: '000000000000000000000000',
      walletAddress: '0x1111111111111111111111111111111111111111',
      role: 'admin',
    },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn as jwt.SignOptions['expiresIn'] },
  );

  res.json(
    ApiResponse.success(
      {
        accessToken: token,
        tokenType: 'Bearer',
        role: 'admin',
      },
      'Development admin token issued',
    ),
  );
});

export default devAuthRouter;