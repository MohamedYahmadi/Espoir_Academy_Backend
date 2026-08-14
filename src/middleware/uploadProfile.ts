import multer from 'multer';
import path from 'path';

// Allowed file types
const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png'];

const allowedExtensions = ['.jpg', '.jpeg', '.png'];

// Files are kept in memory; persistence is handled by the storage service
const storage = multer.memoryStorage();

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

// Single file upload for sport image (same image-only rules)
export const uploadSportImage = upload.single('image');