require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { uploadToBunnyCDN } = require('../bunny-cdn-api/fetch-upload-to-bunny-cdn');
const Queue = require('bull');
const uploadQueue = new Queue('uploadQueue', {
    redis: {
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT,
        password: process.env.REDIS_PASSWORD,
    },
});

const getFilePrefix = (extension) => {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const videoExtensions = ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.mkv'];
    if (imageExtensions.includes(extension)) return 'image';
    if (videoExtensions.includes(extension)) return 'video';
    return 'file';
};

const getFolderByFileType = (extension) => {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const videoExtensions = ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.mkv'];
    if (imageExtensions.includes(extension)) return 'images';
    if (videoExtensions.includes(extension)) return 'videos';
    return 'files';
};

uploadQueue.process(async (job, done) => {
    const { folder, filePath, fileUrl } = job.data;
    console.log(`Processing queue task for file: ${filePath}`);

    try {
        const fileStream = fs.createReadStream(filePath);

        console.log(`Uploading file ${filePath} to BunnyCDN...`);

        const onSuccess = () => {
            console.log(`File successfully uploaded to BunnyCDN: ${fileUrl}`);
            fs.unlinkSync(filePath);
            done();
        };

        const onError = (error) => {
            console.error(`Error uploading file to BunnyCDN: ${error}`);
            done(new Error(`BunnyCDN upload error: ${error.message}`));
        };

        uploadToBunnyCDN(path.join(folder, path.basename(filePath)), fileStream, onSuccess, onError);
    } catch (error) {
        console.error(`Error during BunnyCDN upload: ${error.message}`);
        done(new Error(error.message));
    }
});

const processUpload = async (req, res) => {
    const { userId, timestamp, chunkNumber, totalChunks } = req.body;

    if (!userId || !timestamp || !chunkNumber || !totalChunks) {
        return res.status(400).json({ message: 'Missing required fields' });
    }

    const file = req.file;
    if (!file) {
        return res.status(400).json({ message: 'File is missing' });
    }

    const fileExtension = path.extname(file.originalname).toLowerCase();
    const folder = getFolderByFileType(fileExtension);
    const filePrefix = getFilePrefix(fileExtension);
    const finalFileName = `${filePrefix}-${userId}-${timestamp}${fileExtension}.part${chunkNumber}`;
    const finalFilePath = path.join('uploads', finalFileName);
    console.log({ finalFilePath });

    fs.renameSync(file.path, finalFilePath);

    if (parseInt(chunkNumber, 10) === parseInt(totalChunks, 10)) {
        const mergedFilePath = finalFilePath.replace(`.part${chunkNumber}`, '');
        const mergedFile = fs.createWriteStream(mergedFilePath);

        try {
            for (let i = 1; i <= totalChunks; i++) {
                const partFilePath = path.join('uploads', `${filePrefix}-${userId}-${timestamp}${fileExtension}.part${i}`);
                const partFile = fs.createReadStream(partFilePath);

                await new Promise((resolve, reject) => {
                    partFile.pipe(mergedFile, { end: false });
                    partFile.on('end', () => {
                        fs.unlinkSync(partFilePath);
                        resolve();
                    });
                    partFile.on('error', reject);
                });
            }

            mergedFile.end();

            mergedFile.on('finish', () => {
                const fileUrl = `https://${process.env.PULL_ZONE}/${folder}/${filePrefix}-${userId}-${timestamp}${fileExtension}`;
                res.status(201).json({ message: 'File merged successfully', url: fileUrl });

                uploadQueue.add({ folder, filePath: mergedFilePath, fileUrl });
            });

            mergedFile.on('error', (error) => {
                res.status(500).json({ message: 'Error during file merge' });
            });
        } catch (err) {
            res.status(500).json({ message: 'Error during file merging' });
        }
    } else {
        res.status(201).json({ message: 'Chunk uploaded successfully' });
    }
};

module.exports = {
    processUpload,
};
