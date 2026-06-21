const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');

const HASHES_FILE = path.join(__dirname, '../data/hashes.json');

fs.ensureDirSync(path.dirname(HASHES_FILE));

if (!fs.existsSync(HASHES_FILE)) {
    fs.writeJsonSync(HASHES_FILE, []);
}

let hashSet = null;

function loadHashes() {
    if (!hashSet) {
        try {
            const arr = fs.readJsonSync(HASHES_FILE);
            hashSet = new Set(arr);
        } catch (e) {
            hashSet = new Set();
        }
    }
    return hashSet;
}

function saveHashes() {
    if (hashSet) {
        fs.writeJsonSync(HASHES_FILE, Array.from(hashSet), { spaces: 2 });
    }
}

function hasHash(hash) {
    return loadHashes().has(hash);
}

function addHash(hash) {
    loadHashes().add(hash);
    saveHashes();
}

function removeHash(hash) {
    const set = loadHashes();
    if (set.has(hash)) {
        set.delete(hash);
        saveHashes();
    }
}

function addHashes(hashesArray) {
    const set = loadHashes();
    let changed = false;
    for (const h of hashesArray) {
        if (h && !set.has(h)) {
            set.add(h);
            changed = true;
        }
    }
    if (changed) saveHashes();
}

function removeHashes(hashesArray) {
    const set = loadHashes();
    let changed = false;
    for (const h of hashesArray) {
        if (h && set.has(h)) {
            set.delete(h);
            changed = true;
        }
    }
    if (changed) saveHashes();
}

function getFileHash(filePath) {
    return new Promise((resolve, reject) => {
        const hash = crypto.createHash('sha256');
        const stream = fs.createReadStream(filePath);
        stream.on('error', err => reject(err));
        stream.on('data', chunk => hash.update(chunk));
        stream.on('end', () => resolve(hash.digest('hex')));
    });
}

module.exports = {
    hasHash,
    addHash,
    removeHash,
    addHashes,
    removeHashes,
    getFileHash
};
