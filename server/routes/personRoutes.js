const express = require('express');
const multer = require('multer');
const { getFaceDescriptor } = require('../services/faceService');
const { addPerson, getDatabase } = require('../services/storageService');
const fs = require('fs-extra');
const router = express.Router();

const upload = multer({ dest: 'uploads/' });

router.get('/', (req, res) => {
    try {
        const db = getDatabase();
        res.json({ persons: Object.keys(db.persons) });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.post('/', upload.single('image'), async (req, res) => {
    try {
        const { name } = req.body;
        if (!name || !req.file) {
            return res.status(400).json({ error: 'Name and image are required' });
        }

        const imageBuffer = await fs.readFile(req.file.path);
        
        // Extract face descriptor
        const descriptor = await getFaceDescriptor(imageBuffer);
        
        // Save to DB
        addPerson(name, [descriptor]);

        // Cleanup
        await fs.remove(req.file.path);

        res.json({ success: true, message: `Person ${name} added successfully.` });
    } catch (error) {
        console.error('Error adding person:', error);
        if (req.file) await fs.remove(req.file.path);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
