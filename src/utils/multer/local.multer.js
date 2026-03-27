import multer from "multer";
import fs from "node:fs";
import path from "node:path";

export const fileValidationTypes = {
  image: ["image/jpg", "image/jpeg", "image/png", "image/gif"],
};

export const uploadDiskFile = (customPath = "general", fileValidation = []) => {
  const basePath = `uploads/${customPath}`;
  const fullPath = path.resolve(`./src/${basePath}`);
  console.log({ basePath, fullPath });
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
  }

  const storage = multer.diskStorage({
    destination: (req, file, callback) => {
      callback(null, fullPath);
    },
    filename: (req, file, callback) => {
      console.log({ file });
      const uniqueSuffix = Date.now() + "_" + Math.round(Math.random() * 1e9) + file.originalname;
      file.finalPath = basePath + "_" + uniqueSuffix + "_" + file.originalname;
      callback(null, uniqueSuffix + "_" + file.originalname);
    },
  });

  function fileFilter(req, file, callback) {
    if (fileValidation.includes(file.mimetype)) {
      callback(null, true);
    } else {
      callback("Invalid file format", false);
    }
  }
  return multer({ dest: "defaultUpload", fileFilter, storage });
};
