// src/middlewares/upload.middleware.ts
// Subida segura: multer a carpeta privada (nunca servida como estática) + verificación
// del contenido real (primeros bytes) + extensión decidida por el servidor, no por el cliente.
import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs';
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { HttpError } from '../utils/http-error';

const uploadDir = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Nombre temporal sin extensión del cliente; se renombra tras verificar el contenido
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, _file, cb) => cb(null, `${crypto.randomUUID()}.tmp`),
});

const MB = 1024 * 1024;

type Tipo = 'pdf' | 'docx' | 'doc' | 'jpg' | 'png' | 'webp' | 'csv';

const TIPOS: Record<Tipo, { ext: string; mime: string }> = {
  pdf: { ext: '.pdf', mime: 'application/pdf' },
  docx: { ext: '.docx', mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
  doc: { ext: '.doc', mime: 'application/msword' },
  jpg: { ext: '.jpg', mime: 'image/jpeg' },
  png: { ext: '.png', mime: 'image/png' },
  webp: { ext: '.webp', mime: 'image/webp' },
  csv: { ext: '.csv', mime: 'text/csv' },
};

// Reglas por campo del formulario: tipos permitidos y tamaño máximo
const REGLAS: Record<string, { tipos: Tipo[]; max: number }> = {
  cv: { tipos: ['pdf', 'docx', 'doc'], max: 5 * MB },
  idCard: { tipos: ['pdf', 'jpg', 'png'], max: 5 * MB },
  file: { tipos: ['pdf', 'docx', 'doc', 'jpg', 'png'], max: 5 * MB },
  photo: { tipos: ['jpg', 'png', 'webp'], max: 2 * MB },
  dataset: { tipos: ['csv'], max: 10 * MB },
};

function detectarTipo(ruta: string): Tipo | null {
  const fd = fs.openSync(ruta, 'r');
  try {
    const b = Buffer.alloc(1024);
    const n = fs.readSync(fd, b, 0, 1024, 0);
    const h = b.subarray(0, n);
    if (h.subarray(0, 5).toString('latin1') === '%PDF-') return 'pdf';
    if (h[0] === 0xff && h[1] === 0xd8 && h[2] === 0xff) return 'jpg';
    if (h.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
    if (h.subarray(0, 4).toString('latin1') === 'RIFF' && h.subarray(8, 12).toString('latin1') === 'WEBP') return 'webp';
    if (h.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04]))) return 'docx'; // ZIP (OOXML)
    if (h.subarray(0, 4).equals(Buffer.from([0xd0, 0xcf, 0x11, 0xe0]))) return 'doc'; // OLE2
    // CSV: texto sin bytes nulos
    if (n > 0 && !h.includes(0)) return 'csv';
    return null;
  } finally {
    fs.closeSync(fd);
  }
}

function borrar(ruta: string) {
  fs.promises.unlink(ruta).catch(() => {});
}

function archivosDe(req: Request): Express.Multer.File[] {
  if (req.file) return [req.file];
  if (Array.isArray(req.files)) return req.files;
  if (req.files) return Object.values(req.files).flat();
  return [];
}

// Verifica contenido real, tamaño por campo y renombra con extensión segura
function verificarContenido(req: Request, _res: Response, next: NextFunction) {
  const archivos = archivosDe(req);
  try {
    for (const f of archivos) {
      const regla = REGLAS[f.fieldname];
      if (!regla) throw new HttpError(400, 'Campo de archivo no permitido');
      if (f.size > regla.max) throw new HttpError(413, `El archivo supera el máximo de ${regla.max / MB} MB`);

      const tipo = detectarTipo(f.path);
      if (!tipo || !regla.tipos.includes(tipo)) {
        throw new HttpError(415, `Tipo de archivo no permitido. Formatos válidos: ${regla.tipos.join(', ')}`);
      }
      // Un CSV debe declararse como tal (evita pasar texto cualquiera como dataset)
      if (tipo === 'csv' && path.extname(f.originalname).toLowerCase() !== '.csv') {
        throw new HttpError(415, 'El dataset debe ser un archivo .csv');
      }

      const nombreSeguro = `${crypto.randomUUID()}${TIPOS[tipo].ext}`;
      const destino = path.join(uploadDir, nombreSeguro);
      fs.renameSync(f.path, destino);
      f.filename = nombreSeguro;
      f.path = destino;
      f.mimetype = TIPOS[tipo].mime;
      // Nombre para mostrar: sin rutas ni caracteres de control, acotado
      f.originalname = path.basename(f.originalname).replace(/[\x00-\x1f]/g, '').slice(0, 150) || nombreSeguro;
    }
    next();
  } catch (err) {
    archivos.forEach((f) => borrar(f.path));
    next(err);
  }
}

// Traduce errores de multer a 413/400 con el formato estándar
function envolver(mw: RequestHandler): RequestHandler {
  return (req, res, next) => {
    mw(req, res, (err?: unknown) => {
      if (err instanceof multer.MulterError) {
        return next(
          err.code === 'LIMIT_FILE_SIZE'
            ? new HttpError(413, 'El archivo es demasiado grande')
            : new HttpError(400, 'Archivo inválido'),
        );
      }
      next(err);
    });
  };
}

const upload = multer({
  storage,
  limits: { fileSize: 10 * MB, files: 2 }, // tope global; el máximo real es por campo (arriba)
});

export const uploadApplicationFiles = [
  envolver(upload.fields([{ name: 'cv', maxCount: 1 }, { name: 'idCard', maxCount: 1 }])),
  verificarContenido,
];
export const uploadDatasetFile = [envolver(upload.single('dataset')), verificarContenido];
export const uploadSingleFile = [envolver(upload.single('file')), verificarContenido];
export const uploadPhotoFile = [envolver(upload.single('photo')), verificarContenido];
