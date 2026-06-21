const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs-extra');
const { processImageFile, copyImageToFolders, getDatabase } = require('../services/storageService');
const { hasCredentials, isAuthenticated, getAuthUrl, getAccessToken } = require('../services/driveService');

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

router.post('/local', async (req, res) => {
    const { folderPath } = req.body;
    if (!folderPath) {
        return res.status(400).json({ error: 'Folder path is required' });
    }

    try {
        if (!fs.existsSync(folderPath)) {
            return res.status(400).json({ error: 'Folder does not exist' });
        }

        const files = await fs.readdir(folderPath);
        const imageFiles = files.filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f));
        
        const db = getDatabase();
        const results = [];

        for (const file of imageFiles) {
            const fullPath = path.join(folderPath, file);
            const targetFolders = await processImageFile(fullPath, db);
            await copyImageToFolders(fullPath, targetFolders, file);
            results.push({ file, matched: targetFolders });
        }

        res.json({ success: true, processed: results.length, total: imageFiles.length, results });
    } catch (error) {
        console.error('Error processing local folder:', error);
        res.status(500).json({ error: error.message });
    }
});

router.post('/upload', upload.array('images'), async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'No files uploaded' });
        }

        const db = getDatabase();
        const results = [];

        for (const file of req.files) {
            const targetFolders = await processImageFile(file.path, db);
            await copyImageToFolders(file.path, targetFolders, file.originalname);
            await fs.remove(file.path);
            results.push({ file: file.originalname, matched: targetFolders });
        }

        res.json({ success: true, processed: results.length, total: req.files.length, results });
    } catch (error) {
        console.error('Error processing uploads:', error);
        if (req.files) {
            for (const file of req.files) {
                await fs.remove(file.path);
            }
        }
        res.status(500).json({ error: error.message });
    }
});

// Drive Routes
router.get('/drive/status', (req, res) => {
    res.json({ 
        hasCredentials: hasCredentials(), 
        isAuthenticated: isAuthenticated(),
        authUrl: !isAuthenticated() && hasCredentials() ? getAuthUrl() : null
    });
});

router.post('/drive/callback', async (req, res) => {
    try {
        const { code } = req.body;
        if (!code) return res.status(400).json({ error: 'Code is required' });
        await getAccessToken(code);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
