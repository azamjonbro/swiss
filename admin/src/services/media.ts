import { api } from './api';

export interface MediaUploadResult {
  url: string;
  filename: string;
  kind: 'images' | 'videos';
  size: number;
  mimetype: string;
}

export async function uploadMedia(file: File, onProgress?: (percent: number) => void): Promise<MediaUploadResult> {
  const form = new FormData();
  form.append('file', file);

  const { data } = await api.post<MediaUploadResult>('/admin/media/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (event) => {
      if (onProgress && event.total) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    },
  });

  return data;
}
