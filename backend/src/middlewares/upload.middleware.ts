// src/middlewares/upload.middleware.ts
import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs';
import { HttpError } from '../utils/http-error';

const uploadDir = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueName = `${crypto.randomUUID()}${ext}`;
    cb(null, uniqueName);
  },
});

const allowedMimes = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
  'image/webp',
  'text/csv',
];

const fileFilter: multer.Options['fileFilter'] = (_req, file, cb) => {
  if (allowedMimes.includes(file.mimetype) || file.originalname.endsWith('.csv')) {
    cb(null, true);
  } else {
    cb(new HttpError(400, `Tipo de archivo no permitido: ${file.mimetype}. Formatos válidos: PDF, Word, JPEG, PNG, CSV.`));
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB máximo
  },
});

export const uploadApplicationFiles = upload.fields([
  { name: 'cv', maxCount: 1 },
  { name: 'idCard', maxCount: 1 },
]);

export const uploadDatasetFile = upload.single('dataset');
export const uploadSingleFile = upload.single('file');
