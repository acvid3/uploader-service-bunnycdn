const express = require('express');
const cors = require('cors');
const path = require('path');
const postRoutes = require('./routes/post-routes');
const uploadRoutes = require('./routes/upload-routes');
require('dotenv').config();
require('./services/post-service');

const app = express();

const corsOptions = {
    origin: 'https://filmreach.io',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
    optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
app.use(express.static(path.join(__dirname, '../public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/dev/test_api/v1/upload_form', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/upload-form.html'));
});

app.use('/api/v1', postRoutes);
app.use('/api/v1', uploadRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
