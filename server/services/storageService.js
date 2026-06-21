const fs = require('fs-extra');
const path = require('path');
const { getAllFaces, findBestMatch } = require('./faceService');

const OUTPUT_DIR = path.join(__dirname, '../output');
const DATA_FILE = path.join(__dirname, '../data/db.json');

// Ensure directories exist
fs.ensureDirSync(OUTPUT_DIR);
fs.ensureDirSync(path.dirname(DATA_FILE));

// Initialize DB if doesn't exist
if (!fs.existsSync(DATA_FILE)) {
    fs.writeJsonSync(DATA_FILE, { persons: {} });
}

function getDatabase() {
    return fs.readJsonSync(DATA_FILE);
}

function saveDatabase(data) {
    fs.writeJsonSync(DATA_FILE, data, { spaces: 2 });
}

function addPerson(name, descriptors) {
    const db = getDatabase();
    if (!db.persons[name]) {
        db.persons[name] = [];
    }
    // Convert Float32Array to standard array for JSON serialization
    const serializableDescriptors = descriptors.map(desc => Array.from(desc));
    db.persons[name].push(...serializableDescriptors);
    saveDatabase(db);
}

function getPersons() {
    const db = getDatabase();
    return Object.keys(db.persons);
}

// Helper to determine the destination folder
async function processImageFile(imagePath, db) {
    try {
        const imageBuffer = await fs.readFile(imagePath);
        const detections = await getAllFaces(imageBuffer);
        
        if (detections.length === 0) {
            return ['Unknown']; // No faces
        }

        const matchedNames = new Set();
        
        for (const detection of detections) {
            const match = findBestMatch(detection.descriptor, db.persons);
            if (match) {
                matchedNames.add(match.label);
            }
        }
        
        if (matchedNames.size === 0) {
            return ['Unknown']; // Faces detected but unknown
        }
        
        if (matchedNames.size > 1) {
            // Group photo, let's duplicate it into each person's folder for better organization
            return Array.from(matchedNames);
        }
        
        // Single match
        return Array.from(matchedNames);
        
    } catch (e) {
        console.error(`Error processing image ${imagePath}:`, e);
        return ['Errors'];
    }
}

async function copyImageToFolders(imagePath, targetFolders, fileName) {
    for (const folderName of targetFolders) {
        const targetDir = path.join(OUTPUT_DIR, folderName);
        await fs.ensureDir(targetDir);
        await fs.copy(imagePath, path.join(targetDir, fileName));
    }
}

module.exports = {
    addPerson,
    getPersons,
    getDatabase,
    processImageFile,
    copyImageToFolders,
    OUTPUT_DIR
};
