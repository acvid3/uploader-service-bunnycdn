const express = require('express');
const { addPost } = require('../services/post-service');
const router = express.Router();

router.post('/add_post', (req, res) => {
    const { fileName, userId } = req.body;

    if (!fileName || !userId) {
        return res.status(400).json({ message: 'fileName and userId are required' });
    }

    const result = addPost(fileName, userId);

    if (result.success) {
        res.status(200).json({ message: 'Successfully added to the array', posts: result });
    } else {
        res.status(500).json({ message: 'Failed to add post' });
    }
});

module.exports = router;
