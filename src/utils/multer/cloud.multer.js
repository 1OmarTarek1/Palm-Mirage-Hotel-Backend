import multer from "multer";

export const uploadCloudFile = (fileValidation = []) => {
  const storage = multer.diskStorage({});
  function fileFilter(req, file, callback) {
    if (fileValidation.includes(file.mimetype)) {
      callback(null, true);
    } else {
      callback("Invalid file format", false);
    }
  }

  return multer({ dest: "dest", fileFilter, storage });
};
