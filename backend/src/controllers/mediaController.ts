import { Request, Response } from 'express';
import { ApiError } from '../utils/ApiError';
import { publicMediaPath } from '../middleware/upload';

const VIDEO_TYPES = new Set(['video/mp4', 'video/webm']);

export async function uploadMedia(req: Request, res: Response) {
  const file = req.file;
  if (!file) throw new ApiError(400, 'No file uploaded');

  const kind: 'images' | 'videos' = VIDEO_TYPES.has(file.mimetype) ? 'videos' : 'images';
  res.status(201).json({
    url: publicMediaPath(file.filename, kind),
    filename: file.filename,
    kind,
    size: file.size,
    mimetype: file.mimetype,
  });
}

export async function uploadMultipleMedia(req: Request, res: Response) {
  const files = (req.files as Express.Multer.File[]) ?? [];
  if (!files.length) throw new ApiError(400, 'No files uploaded');

  const results = files.map((file) => {
    const kind: 'images' | 'videos' = VIDEO_TYPES.has(file.mimetype) ? 'videos' : 'images';
    return {
      url: publicMediaPath(file.filename, kind),
      filename: file.filename,
      kind,
      size: file.size,
      mimetype: file.mimetype,
    };
  });

  res.status(201).json({ items: results });
}
