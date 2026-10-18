import { Router, Request, Response } from 'express';

const router = Router();

router.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'overgatario',
    message: 'redi pa cualquier calle',
    timestamp: new Date().toISOString()
  });
});

export default router;