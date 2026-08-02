import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define uploads directory (go up from middleware/ to project root, then uploads/documents/)
const uploadsDir = path.resolve(__dirname, '..', '..', 'uploads', 'documents');

// Allowed file types
const allowedMimeTypes = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'application/pdf',
];

const allowedExtensions = ['.jpg', '.jpeg', '.png', '.pdf'];

// Storage configuration
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueName = `${file.fieldname}-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
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
    return cb(new Error(`File type '${file.mimetype}' is not supported. Allowed: JPEG, PNG, PDF`));
  }

  if (!allowedExtensions.includes(ext)) {
    return cb(new Error(`File extension '${ext}' is not supported. Allowed: .jpg, .jpeg, .png, .pdf`));
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

// Expect 3 fields: photo, birthCertificate, medicalCertificate
export const uploadChildDocuments = upload.fields([
  { name: 'photo', maxCount: 1 },
  { name: 'birthCertificate', maxCount: 1 },
  { name: 'medicalCertificate', maxCount: 1 },
]);