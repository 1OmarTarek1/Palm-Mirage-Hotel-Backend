import multer from "multer";

const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp"];

function fileFilter(req, file, cb) {
  if (allowedTypes.includes(file.mimetype)) {
    return cb(null, true);
  }
  return cb(new Error("Only .png, .jpg, .jpeg, .webp formats are allowed"), false);
}

export const uploadFile = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});
