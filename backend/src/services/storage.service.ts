// src/services/storage.service.ts
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads');

// Asegura que la carpeta uploads exista al inicializar
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

export const storageService = {
  getUploadsDir(): string {
    return UPLOADS_DIR;
  },

  /**
   * Guarda un buffer en disco con un nombre seguro aleatorio
   */
  async saveFile(
    buffer: Buffer,
    originalName: string,
    subfolder: string = '',
  ): Promise<{ filename: string; relativePath: string; fullPath: string; size: number }> {
    const ext = path.extname(originalName).toLowerCase();
    const safeName = `${crypto.randomUUID()}${ext}`;
    const targetDir = subfolder ? path.join(UPLOADS_DIR, subfolder) : UPLOADS_DIR;

    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const fullPath = path.join(targetDir, safeName);
    await fs.promises.writeFile(fullPath, buffer);

    const relativePath = subfolder ? path.join(subfolder, safeName) : safeName;
    return {
      filename: safeName,
      relativePath: relativePath.replace(/\\/g, '/'),
      fullPath,
      size: buffer.length,
    };
  },

  /**
   * Obtiene la ruta absoluta de un archivo almacenado, validando que no haya directory traversal
   */
  resolvePath(relativePath: string): string | null {
    const normalized = path.normalize(relativePath).replace(/^(\.\.(\/|\\|$))+/, '');
    const absolutePath = path.join(UPLOADS_DIR, normalized);

    // Evita escapes fuera de la carpeta uploads
    if (!absolutePath.startsWith(UPLOADS_DIR)) {
      return null;
    }

    if (!fs.existsSync(absolutePath)) {
      return null;
    }

    return absolutePath;
  },

  /**
   * Elimina un archivo si existe
   */
  async deleteFile(relativePath: string): Promise<boolean> {
    const fullPath = this.resolvePath(relativePath);
    if (!fullPath) return false;

    try {
      await fs.promises.unlink(fullPath);
      return true;
    } catch {
      return false;
    }
  },
};
