import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Request } from 'express';
import { env } from '../config/env';
import { ApiError } from '../utils/ApiError';

const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif']);
const VIDEO_TYPES = new Set(['video/mp4', 'video/webm']);

const MAX_IMAGE_SIZE = 8 * 1024 * 1024; // 8MB
const MAX_VIDEO_SIZE = 60 * 1024 * 1024; // 60MB

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req: Request, file, cb) => {
    const isVideo = VIDEO_TYPES.has(file.mimetype);
    const dir = path.join(process.cwd(), env.uploadDir, isVideo ? 'videos' : 'images');
    ensureDir(dir);
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, unique);
  },
});

function fileFilter(_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) {
  if (IMAGE_TYPES.has(file.mimetype) || VIDEO_TYPES.has(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new ApiError(400, 'Unsupported file type. Use JPEG, PNG, WebP, AVIF, MP4, or WebM.'));
  }
}

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: Math.max(MAX_IMAGE_SIZE, MAX_VIDEO_SIZE) },
});

export function publicMediaPath(filename: string, kind: 'images' | 'videos'): string {
  return `/uploads/${kind}/${filename}`;
}
