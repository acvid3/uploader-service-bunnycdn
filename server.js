require("dotenv").config();
const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const cors = require("cors");
const Queue = require("bull");
const https = require("https");

const app = express();
const corsOptions = {
    origin: "https://filmreach.io",
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    credentials: true,
    optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

console.log("Server is starting...");

app.get("/dev/test_api/v1/upload_file", (req, res) => {
    console.log("GET request received for /dev/test_api/v1/upload_file");
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp"];
const videoExtensions = [".mp4", ".avi", ".mov", ".wmv", ".flv", ".mkv"];

function getFilePrefix(extension) {
    if (imageExtensions.includes(extension)) return "image";
    if (videoExtensions.includes(extension)) return "video";
    return "file";
}

function getFolderByFileType(extension) {
    if (imageExtensions.includes(extension)) return "images";
    if (videoExtensions.includes(extension)) return "videos";
    return "files";
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        console.log("Saving file to 'uploads/'");
        cb(null, "uploads/");
    },
    filename: (req, file, cb) => {
        const fileExtension = path.extname(file.originalname).toLowerCase();
        const tempName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}${fileExtension}`;
        console.log(`Generated temporary filename: ${tempName}`);
        cb(null, tempName);
    },
});

const upload = multer({ storage });

const uploadQueue = new Queue("uploadQueue", {
    redis: {
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT,
        password: process.env.REDIS_PASSWORD,
    },
});

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
            console.log(JSON.stringify(error, null, 2));
            done(new Error(`BunnyCDN upload error: ${error}`));
        };

        uploadToBunnyCDN(path.join(folder, path.basename(filePath)), fileStream, onSuccess, onError);
    } catch (error) {
        console.error(`Error during BunnyCDN upload: ${error.message}`);
        done(new Error(error.message));
    }
});

app.post("/api/v1/upload_file", upload.single("file"), async (req, res) => {
    console.log("POST request received for /api/v1/upload_file");
    const { userId, timestamp, chunkNumber, totalChunks } = req.body;
    console.log(`Request details: userId=${userId}, timestamp=${timestamp}, chunkNumber=${chunkNumber}, totalChunks=${totalChunks}`);

    if (!userId || !timestamp || !chunkNumber || !totalChunks) {
        console.log("Error: Missing required fields");
        return res.status(400).json({ message: "Missing required fields" });
    }

    const file = req.file;
    if (!file) {
        console.log("Error: File is missing in the request");
        return res.status(400).json({ message: "File is missing" });
    }

    const fileExtension = path.extname(file.originalname).toLowerCase();
    const folder = getFolderByFileType(fileExtension);
    const filePrefix = getFilePrefix(fileExtension);
    const finalFileName = `${filePrefix}-${userId}-${timestamp}${fileExtension}.part${chunkNumber}`;
    const finalFilePath = path.join("uploads", finalFileName);

    console.log(`Renaming uploaded chunk to ${finalFilePath}`);
    fs.renameSync(file.path, finalFilePath);

    if (parseInt(chunkNumber, 10) === parseInt(totalChunks, 10)) {
        console.log("All chunks received. Starting merge process...");

        const mergedFilePath = finalFilePath.replace(`.part${chunkNumber}`, "");
        const mergedFile = fs.createWriteStream(mergedFilePath);

        try {
            for (let i = 1; i <= totalChunks; i++) {
                const partFilePath = path.join("uploads", `${filePrefix}-${userId}-${timestamp}${fileExtension}.part${i}`);
                console.log(`Merging chunk ${i} from file: ${partFilePath}`);
                const partFile = fs.createReadStream(partFilePath);

                await new Promise((resolve, reject) => {
                    partFile.pipe(mergedFile, { end: false });
                    partFile.on("end", () => {
                        console.log(`Chunk ${i} merged successfully. Deleting chunk...`);
                        fs.unlinkSync(partFilePath);
                        resolve();
                    });
                    partFile.on("error", (err) => {
                        console.error(`Error merging chunk ${i}: ${err.message}`);
                        reject(err);
                    });
                });
            }

            mergedFile.end();

            mergedFile.on("finish", async () => {
                console.log("File merge completed. Adding task to upload to BunnyCDN...");
                const fileUrl = `https://${process.env.PULL_ZONE}/${folder}/${filePrefix}-${userId}-${timestamp}${fileExtension}`;
                res.status(201).json({ message: "File merged successfully", url: fileUrl });

                try {
                    uploadQueue.add({ folder, filePath: mergedFilePath, fileUrl });
                    console.log("Task added to upload queue successfully.");
                } catch (error) {
                    console.error(`Error adding task to queue: ${error.message}`);
                }
            });

            mergedFile.on("error", (error) => {
                console.error(`Error finalizing merged file: ${error.message}`);
                res.status(500).json({ message: "Error during file merge" });
            });
        } catch (err) {
            console.error(`Error during merging chunks: ${err.message}`);
            res.status(500).json({ message: "Error during file merging" });
        }
    } else {
        console.log(`Chunk ${chunkNumber} of ${totalChunks} uploaded successfully`);
        res.status(201).json({ message: "Chunk uploaded successfully" });
    }
});

const uploadToBunnyCDN = async (fileName, fileStream, onSuccess, onError) => {
    const options = {
        method: "PUT",
        host: process.env.HOST_NAME,
        path: `/${process.env.STORAGE_ZONE}/${fileName}`,
        headers: {
            AccessKey: process.env.API_KEY,
            "Content-Type": "application/octet-stream",
        },
    };

    const req = https.request(options, (res) => {
        if (res.statusCode === 200 || res.statusCode === 201) {
            onSuccess();
        } else {
            onError(new Error(`Response code ${res.statusCode}`));
        }
    });

    req.on("error", (error) => {
        onError(error);
    });

    fileStream.pipe(req);
};

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
