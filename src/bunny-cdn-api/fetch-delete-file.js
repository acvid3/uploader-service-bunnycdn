require('dotenv').config();
const https = require('https');

const fetchDeleteFile = async (path, fileName) => {
    const options = {
        hostname: process.env.HOST_NAME,
        port: 443,
        path: `/${process.env.STORAGE_ZONE}/${path}/${fileName}`,
        method: 'DELETE',
        headers: {
            AccessKey: process.env.API_KEY,
            Accept: 'application/json',
        },
    };

    return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                if (res.statusCode === 200) {
                    try {
                        const jsonResponse = JSON.parse(data);
                        resolve(jsonResponse);
                    } catch (error) {
                        reject(new Error('JSON parsing error: ' + error.message));
                    }
                } else {
                    reject(new Error(`Error: ${res.statusCode} ${res.statusMessage}`));
                }
            });
        });

        req.on('error', (e) => {
            reject(new Error('Problem with request:' + e.message));
        });

        req.end();
    });
};

module.exports = {
    fetchDeleteFile,
};
