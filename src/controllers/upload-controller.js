const { processUpload } = require('../services/upload-service');

exports.uploadFile = async (req, res) => {
    const { userId, timestamp, chunkNumber, totalChunks } = req.body;

    if (!userId || !timestamp || !chunkNumber || !totalChunks) {
        return res.status(400).json({ message: 'Missing required fields' });
    }

    const file = req.file;
    if (!file) {
        return res.status(400).json({ message: 'File is missing' });
    }

    try {
        await processUpload(file, { userId, timestamp, chunkNumber, totalChunks });
        res.status(201).json({ message: 'File uploaded successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error during file upload' });
    }
};
