/**
 * Storacha is handled client-side in the app (no server-side upload).
 * These routes exist only for backwards compatibility; the app uses in-browser Storacha.
 */

import express from 'express';
import multer from 'multer';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 100 * 1024 * 1024 } });

router.post('/upload', upload.single('file') as unknown as express.RequestHandler, (_req, res) => {
  return res.status(501).json({
    success: false,
    error: 'Storacha upload is client-side only. Enter key and proof in the app.',
  });
});

router.post('/upload/json', express.json(), (_req, res) => {
  return res.status(501).json({
    success: false,
    error: 'Storacha upload is client-side only. Enter key and proof in the app.',
  });
});

router.get('/status', (_req, res) => {
  return res.json({
    configured: false,
    clientSide: true,
    gateway: 'https://storacha.link',
  });
});

export default router;
