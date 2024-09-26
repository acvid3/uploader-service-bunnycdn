const { addNewPost } = require('../services/post-service');

exports.addPost = (req, res) => {
    const { url, userId } = req.body;

    if (!url || !userId) {
        return res.status(400).json({ message: 'url and userId are required' });
    }

    addNewPost({ url, userId });
    res.status(200).json({ message: 'successfully added to the array' });
};
