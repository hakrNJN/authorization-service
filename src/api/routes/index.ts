import { Router } from 'express';
// --- Import specific feature routers below ---
import authorizationRouter from './authorization.routes';
import systemRouter from './system.routes'; // Assuming copied/adapted

const router = Router();

// --- Register feature routers here ---
// System routes (health, info) - usually no prefix needed
router.use('/system', systemRouter);

// Main authorization endpoint
router.use('/', authorizationRouter); // Mount at root or specific path like /v1

export default router;
