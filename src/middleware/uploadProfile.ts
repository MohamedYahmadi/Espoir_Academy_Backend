import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define uploads directory for profile pictures
const uploadsDir = path.resolve(__dirname, '..', '..', 'uploads', 'profiles');

// Ensure the directory exists
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Allowed file types
const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png'];

const allowedExtensions = ['.jpg', '.jpeg', '.png'];

// Storage configuration
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueName = `profile-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, uniqueName);
  },
});

// File filter
const fileFilter = (
  _req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const ext = path.extname(file.originalname).toLowerCase();

  if (!allowedMimeTypes.includes(file.mimetype)) {
    return cb(new Error(`File type '${file.mimetype}' is not supported. Allowed: JPEG, PNG`));
  }

  if (!allowedExtensions.includes(ext)) {
    return cb(new Error(`File extension '${ext}' is not supported. Allowed: .jpg, .jpeg, .png`));
  }

  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
});

// Single file upload for profile picture
export const uploadProfilePicture = upload.single('profilePicture');