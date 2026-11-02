import { Router, Request, Response } from 'express';
import multer from 'multer';
import { storageService } from '../../services/storage.service';
import { authenticate } from '../../middleware/authenticate';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post('/', authenticate, upload.single('file'), async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, message: 'No file uploaded' });
      return;
    }
    const fileUrl = await storageService.uploadFile(req.file);
    res.json({ success: true, url: fileUrl });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
