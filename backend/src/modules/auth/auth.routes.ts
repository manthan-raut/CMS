import { Router } from 'express';
import { login, refresh, logout, changePassword } from './auth.controller';
import { authenticate } from '../../middleware/authenticate';

const router = Router();

router.post('/login', login);
router.post('/refresh', refresh);
router.post('/logout', logout);
router.post('/change-password', authenticate, changePassword);

export default router;
