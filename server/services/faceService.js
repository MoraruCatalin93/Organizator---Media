const path = require('path');
const faceapi = require('@vladmandic/face-api');
const canvas = require('canvas');

// ────────────────────────────────────────────────────────────
// Initialize the best available TensorFlow backend.
//  1. tfjs-node  → native, fast (uses libtensorflow). Requires the
//     libtensorflow binary to be present (downloaded on install).
//  2. fallback   → @tensorflow/tfjs CPU backend. Slower, but works on
//     any machine without native compilation. The server NEVER crashes
//     to a missing .dylib/.dll again.
// ────────────────────────────────────────────────────────────
let tfBackend = 'none';

try {
    require('@tensorflow/tfjs-node');
    tfBackend = 'tfjs-node (native, rapid)';
} catch (e) {
    const reason = (e.message || '').split('\n')[0];
    console.warn(`\x1b[33m%s\x1b[0m`, `[faceService] Backend nativ indisponibil — trec pe fallback CPU.`);
    console.warn(`\x1b[33m%s\x1b[0m`, `[faceService] Motiv: ${reason}`);
    console.warn(`\x1b[33m%s\x1b[0m`, `[faceService] Pentru viteză, încearcă: cd server && npm rebuild @tensorflow/tfjs-node`);
    try {
        const tf = require('@tensorflow/tfjs');
        tf.setBackend('cpu');
        tfBackend = 'tfjs-cpu (fallback, lent dar funcțional)';
    } catch (e2) {
        console.error(`\x1b[31m%s\x1b[0m`, `[faceService] Nici fallback-ul CPU nu a putut fi inițializat:`, (e2.message || '').split('\n')[0]);
    }
}

// Patch nodejs environment so face-api can work with the canvas library
const { Canvas, Image, ImageData } = canvas;
faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

const MODELS_PATH = path.join(__dirname, '../models');

let modelsLoaded = false;

async function loadModels() {
    if (modelsLoaded) return;
    try {
        console.log(`\x1b[36m%s\x1b[0m`, `[faceService] Backend activ: ${tfBackend}`);
        console.log('Loading face-api models from:', MODELS_PATH);
        await faceapi.nets.ssdMobilenetv1.loadFromDisk(MODELS_PATH);
        await faceapi.nets.faceLandmark68Net.loadFromDisk(MODELS_PATH);
        await faceapi.nets.faceRecognitionNet.loadFromDisk(MODELS_PATH);
        modelsLoaded = true;
        console.log(`\x1b[32m%s\x1b[0m`, `[faceService] Modele încărcate. Gata de procesare!`);
    } catch (error) {
        console.error('Error loading face-api models:', error);
        throw error;
    }
}

/**
 * Get face descriptor (embedding) from an image buffer
 * @param {Buffer} imageBuffer 
 * @returns {Float32Array} The face descriptor of the most prominent face
 */
async function getFaceDescriptor(imageBuffer) {
    await loadModels();
    
    const img = new Image();
    img.src = imageBuffer;
    
    // Detect single face with landmarks and descriptor
    const detection = await faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor();
    
    if (!detection) {
        throw new Error('No face detected in the image');
    }
    
    return detection.descriptor;
}

/**
 * Get all face descriptors from an image
 * @param {Buffer} imageBuffer 
 * @returns {Array} Array of detections with descriptors
 */
async function getAllFaces(imageBuffer) {
    await loadModels();
    
    const img = new Image();
    img.src = imageBuffer;
    
    const detections = await faceapi.detectAllFaces(img).withFaceLandmarks().withFaceDescriptors();
    
    return detections;
}

/**
 * Compare an unknown face descriptor against known descriptors
 * @param {Float32Array} queryDescriptor 
 * @param {Object} labeledDescriptorsMap Map of { personName: [descriptor1, descriptor2...] }
 * @param {Number} threshold 
 * @returns {Object|null} Best match object { label, distance } or null
 */
function findBestMatch(queryDescriptor, labeledDescriptorsMap, threshold = 0.55) {
    const labeledFaceDescriptors = Object.keys(labeledDescriptorsMap).map(name => {
        // Descriptors might come from JSON as normal arrays, so we ensure they are Float32Array
        const descriptors = labeledDescriptorsMap[name].map(desc => {
            return desc instanceof Float32Array ? desc : new Float32Array(Object.values(desc));
        });
        return new faceapi.LabeledFaceDescriptors(name, descriptors);
    });

    if (labeledFaceDescriptors.length === 0) return null;

    const faceMatcher = new faceapi.FaceMatcher(labeledFaceDescriptors, threshold);
    const bestMatch = faceMatcher.findBestMatch(queryDescriptor);
    
    if (bestMatch.label === 'unknown') {
        return null;
    }
    
    return {
        label: bestMatch.label,
        distance: bestMatch.distance
    };
}

module.exports = {
    loadModels,
    getFaceDescriptor,
    getAllFaces,
    findBestMatch
};
