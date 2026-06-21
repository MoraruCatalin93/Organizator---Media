const express = require('express');
const multer = require('multer');
const fs = require('fs-extra');
const { getFaceDescriptor } = require('../services/faceService');
const { addPerson, getDatabase, saveDatabase, deletePerson, countDescriptors } = require('../services/storageService');

const router = express.Router();

const MAX_UPLOAD_MB = parseInt(process.env.MAX_UPLOAD_MB || '25', 10);

const upload = multer({
    dest: 'uploads/',
    limits: { fileSize: MAX_UPLOAD_MB * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        if (/\.(jpe?g|png|webp|gif|bmp|tiff?)$/i.test(file.originalname)) return cb(null, true);
        cb(new Error('Doar imagini (JPG, PNG, WEBP, GIF, BMP, TIFF).'));
    }
});

router.get('/', (req, res) => {
    try {
        const { getPersonsSummary } = require('../repositories/personRepository');
        const persons = getPersonsSummary();
        res.json({ persons });
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
        
        // Move file to references directory
        const path = require('path');
        const refDir = path.join(__dirname, '../data/references', name);
        await fs.ensureDir(refDir);
        const finalFilename = `${Date.now()}_${req.file.originalname}`;
        const finalPath = path.join(refDir, finalFilename);
        await fs.move(req.file.path, finalPath);
        
        // Generate relative path for DB
        const relPath = path.join(name, finalFilename);
        
        // Save to DB
        const { addPersonDescriptor } = require('../repositories/personRepository');
        addPersonDescriptor(name, [descriptor], false, relPath);

        res.json({ success: true, message: `Person ${name} added successfully.` });
    } catch (error) {
        console.error('Error adding person:', error);
        if (req.file) await fs.remove(req.file.path);
        res.status(500).json({ error: error.message });
    }
});

router.put('/rename', async (req, res) => {
    try {
        const { oldName, newName } = req.body;
        if (!oldName || !newName) return res.status(400).json({ error: 'Nume lipsă.' });

        const { renamePerson } = require('../repositories/personRepository');
        renamePerson(oldName, newName);

        // Move files
        const config = require('../config');
        const path = require('path');
        const fs = require('fs-extra');
        
        const oldDir = path.join(config.outputDir, oldName);
        const newDir = path.join(config.outputDir, newName);
        
        if (fs.existsSync(oldDir)) {
            fs.ensureDirSync(newDir);
            const files = fs.readdirSync(oldDir);
            for (const file of files) {
                fs.moveSync(path.join(oldDir, file), path.join(newDir, file), { overwrite: true });
            }
            fs.removeSync(oldDir);
        }

        res.json({ success: true, message: `Redenumit în ${newName}` });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Delete a person and all their face descriptors
router.delete('/:name', async (req, res) => {
    try {
        const { name } = req.params;
        const deleted = deletePerson(name);
        if (!deleted) return res.status(404).json({ error: 'Persoana nu a fost găsită.' });
        
        // Clean up references folder
        const path = require('path');
        const refDir = path.join(__dirname, '../data/references', name);
        await fs.remove(refDir);
        
        res.json({ success: true, message: `Persoana ${name} a fost ștearsă.` });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Get all references for a person
router.get('/:name/references', (req, res) => {
    try {
        const { getPersonReferences } = require('../repositories/personRepository');
        const references = getPersonReferences(req.params.name);
        res.json({ references });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Delete a specific reference
router.delete('/reference/:id', async (req, res) => {
    try {
        const { deleteReference } = require('../repositories/personRepository');
        const ref = deleteReference(req.params.id);
        if (ref && ref.image_path) {
            const path = require('path');
            const fullPath = path.join(__dirname, '../data/references', ref.image_path);
            await fs.remove(fullPath);
        }
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Set a reference as primary
router.put('/reference/:id/primary', (req, res) => {
    try {
        const { personName } = req.body;
        if (!personName) return res.status(400).json({ error: 'Nume lipsă.' });
        
        const { setPrimaryReference } = require('../repositories/personRepository');
        setPrimaryReference(req.params.id, personName);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

module.exports = router;
