const express = require('express');
const multer = require('multer');
const { processUpload } = require('../services/upload-service');
const router = express.Router();

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const fileExtension = require('path').extname(file.originalname).toLowerCase();
        const tempName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}${fileExtension}`;
        cb(null, tempName);
    },
});

const upload = multer({ storage });

router.post('/upload_file', upload.single('file'), processUpload);

module.exports = router;
