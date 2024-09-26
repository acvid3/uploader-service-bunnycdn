const { fetchStorageList } = require('../bunny-cdn-api/fetch-list-files-from-directory');
const { fetchDeleteFile } = require('../bunny-cdn-api/fetch-delete-file');
const { ExpiringElements } = require('../utils/expiring-elements');
const expiringElements = new ExpiringElements();

const sleep = async (ms) => {
    return new Promise((resolve) => setTimeout(resolve, ms));
};

const formatStrDateToUnixTime = (dateStr) => Math.floor(new Date(dateStr).getTime());

const trackListCDN = async () => {
    try {
        const posts = expiringElements.getElements();
        const response = await fetchStorageList('videos');

        response.map((file) => {
            if (Date.now() - formatStrDateToUnixTime(file.DateCreated) > 3600000) {
                console.log(`${Date.now() - formatStrDateToUnixTime(file.DateCreated)} > 3600000`);
                posts.map(async ({ fileName }) => {
                    console.log({ fileName, ObjectName: file.ObjectName });
                    if (fileName !== file.ObjectName) {
                        try {
                            console.log(`File deleted successfuly ${file.ObjectName}.`);
                            const res = await fetchDeleteFile('videos', file.ObjectName);
                            console.log('Response:', res);
                        } catch (error) {
                            console.error('Error s:', error.message);
                        }
                    }
                });
            }

            console.log('unixtime:', formatStrDateToUnixTime(file.DateCreated));
        });
    } catch (error) {
        console.error('Error:', error.message);
    }
};

const startMonitoring = async () => {
    while (true) {
        await sleep(10000);

        trackListCDN();
    }
};

startMonitoring();

const addPost = (fileName, userId) => {
    const newPost = { fileName, userId, createdAt: Date.now() };

    expiringElements.addElement(newPost);

    return { success: true, expiringElements: expiringElements.getElements() };
};

module.exports = {
    addPost,
};
