const faceService = require('./services/faceService');

async function test() {
    try {
        await faceService.loadModels();
        console.log('Test successful: Models loaded properly.');
    } catch (e) {
        console.error('Test failed:', e);
    }
}

test();
