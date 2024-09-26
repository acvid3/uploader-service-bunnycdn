const fs = require('fs');
const path = require('path');

const uploadDir = path.join(__dirname, 'uploads');
const checkInterval = 10 * 1000;
const maxChunkAge = 15 * 60 * 1000;

function extractPrefix(fileName) {
    const match = fileName.match(/^(video|image|file)-(\d+)-(\d+)\.[a-zA-Z]+/);
    return match ? match[0] : null;
}

function checkChunks() {
    fs.readdir(uploadDir, (err, files) => {
        if (err) {
            console.error('Error reading uploads folder:', err);
            return;
        }

        const now = Date.now();
        const chunkGroups = {};

        files.forEach((file) => {
            const prefix = extractPrefix(file);

            if (!prefix) return;

            const filePath = path.join(uploadDir, file);
            const stats = fs.statSync(filePath);
            const creationTime = Number(stats.birthtimeMs.toFixed(0));

            if (!chunkGroups[prefix]) {
                chunkGroups[prefix] = [];
            }
            chunkGroups[prefix].push({ file, creationTime });
        });

        Object.keys(chunkGroups).forEach((prefix) => {
            const chunks = chunkGroups[prefix];
            const sortedChunks = chunks.sort((a, b) => a.creationTime - b.creationTime);
            const lastChunk = sortedChunks[sortedChunks.length - 1];

            if (now - lastChunk.creationTime > maxChunkAge) {
                console.log(`No new chunks for more than 1 minute for ${prefix}, deleting all chunks...`);
                console.log(sortedChunks);
                sortedChunks.forEach(({ file }) => {
                    fs.unlinkSync(path.join(uploadDir, file));
                });
            }
        });
    });
}

function startAutoCleaner() {
    console.log('Tracker Auto Cleaner is starting...');
    setInterval(checkChunks, checkInterval);
}

// startAutoCleaner();
