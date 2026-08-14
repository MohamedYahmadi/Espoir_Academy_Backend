import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';
import { fileURLToPath } from 'url';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Local uploads root (project root /uploads)
const localUploadsDir = path.resolve(__dirname, '..', '..', 'uploads');

export const isS3Storage = (): boolean =>
  (process.env.STORAGE_DRIVER || 'local').toLowerCase() === 's3';

let s3Client: S3Client | null = null;
let s3Bucket = '';

if (isS3Storage()) {
  s3Bucket = process.env.S3_BUCKET || '';
  s3Client = new S3Client({
    region: process.env.S3_REGION || 'us-east-1',
    endpoint: process.env.S3_ENDPOINT || undefined,
    forcePathStyle: !!process.env.S3_ENDPOINT,
    credentials:
      process.env.S3_ACCESS_KEY_ID || process.env.S3_SECRET_ACCESS_KEY
        ? {
            accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
            secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
          }
        : undefined,
  });
}

const generateFileName = (fieldname: string, originalName: string): string => {
  const ext = path.extname(originalName || '').toLowerCase();
  return `${fieldname}-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
};

export interface SaveFileOptions {
  folder: 'documents' | 'profiles' | 'sports';
  fieldname: string;
  originalname: string;
  mimetype: string;
}

/**
 * Persist an uploaded file (buffer) and return its relative path
 * (e.g. "uploads/documents/photo-123456789.png").
 * The same path convention is used for local disk and S3 so that
 * stored DB values and the /uploads endpoint behave identically.
 */
export const saveFile = async (
  buffer: Buffer,
  options: SaveFileOptions
): Promise<string> => {
  const filename = generateFileName(options.fieldname, options.originalname);
  const relativePath = `uploads/${options.folder}/${filename}`;

  if (isS3Storage() && s3Client) {
    await s3Client.send(
      new PutObjectCommand({
        Bucket: s3Bucket,
        Key: relativePath,
        Body: buffer,
        ContentType: options.mimetype,
      })
    );
    return relativePath;
  }

  const dir = path.join(localUploadsDir, options.folder);
  fs.mkdirSync(dir, { recursive: true });
  await fs.promises.writeFile(path.join(dir, filename), buffer);
  return relativePath;
};

/**
 * Delete a stored file by its relative path. Safe to call with empty paths.
 */
export const deleteFile = async (relativePath?: string): Promise<void> => {
  if (!relativePath) return;

  if (isS3Storage() && s3Client) {
    await s3Client.send(
      new DeleteObjectCommand({ Bucket: s3Bucket, Key: relativePath })
    );
    return;
  }

  const absolute = path.join(localUploadsDir, relativePath.replace(/^uploads\//, ''));
  await fs.promises.unlink(absolute).catch(() => {
    // Ignore missing files
  });
};

export interface StoredFile {
  stream: Readable;
  contentType?: string;
}

/**
 * Open a file for serving. Returns null when the file does not exist.
 */
export const getFileStream = async (
  relativePath: string
): Promise<StoredFile | null> => {
  if (isS3Storage() && s3Client) {
    try {
      const result = await s3Client.send(
        new GetObjectCommand({ Bucket: s3Bucket, Key: relativePath })
      );
      return {
        stream: result.Body as Readable,
        contentType: result.ContentType,
      };
    } catch {
      return null;
    }
  }

  const absolute = path.join(localUploadsDir, relativePath.replace(/^uploads\//, ''));
  if (!fs.existsSync(absolute)) return null;
  return { stream: fs.createReadStream(absolute) };
};
