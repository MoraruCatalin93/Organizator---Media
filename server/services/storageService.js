const fs = require('fs-extra');
const path = require('path');
const { getAllFaces, findBestMatch } = require('./faceService');
const { prepareImage } = require('./imageService');
const { getStorageProvider } = require('../storage');
const config = require('../config');

const OUTPUT_DIR = config.outputDir;
const { getAllPersonsWithDescriptors, addPersonDescriptor, deletePerson: deletePersonRepo, getPersonsSummary } = require('../repositories/personRepository');

// Ensure directories exist
fs.ensureDirSync(OUTPUT_DIR);

function getDatabase() {
    return { persons: getAllPersonsWithDescriptors() };
}

function saveDatabase(data) {
    console.warn('saveDatabase called but is deprecated in favor of SQLite repository.');
}

function addPerson(name, descriptors) {
    const serializableDescriptors = descriptors.map(desc => Array.from(desc));
    for (const desc of serializableDescriptors) {
        addPersonDescriptor(name, desc);
    }
}

function getPersons() {
    const summary = getPersonsSummary();
    return summary.map(s => s.name);
}

function deletePerson(name) {
    return deletePersonRepo(name);
}

// Count total descriptor entries for a person's record.
// Handles both arrays of descriptors (flat) and any nested shape defensively.
function countDescriptors(descriptors) {
    if (!Array.isArray(descriptors)) return 0;
    return descriptors.length;
}

// Helper to determine the destination folder(s) for one image.
// Returns { matched, storeBuffer, converted, details }.
async function processImageFile(imagePath, db, transientUnknowns = {}) {
    const raw = await fs.readFile(imagePath);

    // Normalize: EXIF auto-orient + HEIC→JPEG (for detection).
    // storeBuffer keeps the ORIGINAL unless it was HEIC (then the JPEG).
    let detectBuffer = raw;
    let storeBuffer = raw;
    let converted = false;
    try {
        ({ detectBuffer, storeBuffer, converted } = await prepareImage(raw));
    } catch (e) {
        console.warn(`[prepareImage] fallback la buffer brut pentru ${imagePath}: ${e.message}`);
    }

    try {
        const detections = await getAllFaces(detectBuffer);

        if (detections.length === 0) {
            return { matched: ['Unknown'], storeBuffer, converted, details: [] }; // No faces
        }

        const matchedNames = new Set();
        const details = [];

        for (const detection of detections) {
            // Merge global db with transient unknowns for the current batch
            const combinedDb = { ...db.persons, ...transientUnknowns };
            const match = findBestMatch(detection.descriptor, combinedDb);
            
            if (match) {
                matchedNames.add(match.label);
                details.push({ label: match.label, distance: match.distance, descriptor: Array.from(detection.descriptor) });
            } else {
                // Calculate next unknown index
                const dbUnknownsCount = Object.keys(db.persons).filter(k => k.startsWith('Necunoscut')).length;
                const transientCount = Object.keys(transientUnknowns).length;
                const newName = `Necunoscut ${dbUnknownsCount + transientCount + 1}`;
                
                transientUnknowns[newName] = [detection.descriptor];
                matchedNames.add(newName);
                details.push({ label: newName, distance: 0, descriptor: Array.from(detection.descriptor) });
            }
        }

        if (matchedNames.size === 0) {
            return { matched: ['Eroare necunoscută'], storeBuffer, converted, details: [] };
        }

        // Single match or group photo (one entry per known person)
        return { matched: Array.from(matchedNames), storeBuffer, converted, details };

    } catch (e) {
        console.error(`Error processing image ${imagePath}:`, e);
        return { matched: ['Errors'], storeBuffer, converted, details: [] };
    }
}

// Write the (already-prepared) buffer into each target person's folder
// through the active storage provider (local / drive / s3).
async function copyImageToFolders(buffer, targetFolders, fileName, provider) {
    const store = provider || getStorageProvider(config.storageTarget);
    for (const folderName of targetFolders) {
        await store.write(path.join(folderName, fileName), buffer);
    }
}

module.exports = {
    addPerson,
    getPersons,
    getDatabase,
    saveDatabase,
    deletePerson,
    countDescriptors,
    processImageFile,
    copyImageToFolders,
    OUTPUT_DIR
};
