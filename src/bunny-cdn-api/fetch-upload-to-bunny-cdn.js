const https = require('https');

const uploadToBunnyCDN = async (fileName, fileStream, onSuccess, onError) => {
    const options = {
        method: 'PUT',
        host: process.env.HOST_NAME,
        path: `/${process.env.STORAGE_ZONE}/${fileName}`,
        headers: {
            AccessKey: process.env.API_KEY,
            'Content-Type': 'application/octet-stream',
        },
    };

    const req = https.request(options, (res) => {
        if (res.statusCode === 200 || res.statusCode === 201) {
            onSuccess();
        } else {
            onError(new Error(`Response code ${res.statusCode}`));
        }
    });

    req.on('error', (error) => {
        onError(error);
    });

    fileStream.pipe(req);
};

module.exports = {
    uploadToBunnyCDN,
};
