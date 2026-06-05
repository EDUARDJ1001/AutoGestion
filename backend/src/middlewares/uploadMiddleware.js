const fs = require('fs');
const path = require('path');
const multer = require('multer');

const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
const maxImageSizeMb = 5;

const ensureDirectory = (directory) => {
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const baseUploadDir = process.env.UPLOAD_DIR || 'uploads';
    const folder = req.uploadFolder || 'generales';
    const destination = path.resolve(baseUploadDir, folder);

    ensureDirectory(destination);
    cb(null, destination);
  },
  filename: (req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase();
    const safeName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`;

    cb(null, safeName);
  }
});

const fileFilter = (req, file, cb) => {
  if (!allowedMimeTypes.includes(file.mimetype)) {
    return cb(new Error('Formato de imagen no permitido. Usa jpg, jpeg, png o webp.'));
  }

  return cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: maxImageSizeMb * 1024 * 1024
  }
});

const setUploadFolder = (folder) => (req, res, next) => {
  req.uploadFolder = folder;
  next();
};

module.exports = {
  upload,
  setUploadFolder
};
