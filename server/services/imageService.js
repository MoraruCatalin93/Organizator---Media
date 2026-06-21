// sharp is an optional dependency: HEIC/EXIF normalization. If it's not
// installed, the server still boots and works for JPG/PNG/WEBP (face-api
// handles those directly). We lazy-load it and fail gracefully per-image.
let _sharp = null;
function getSharp() {
    if (_sharp === null) {
        try {
            _sharp = require('sharp');
        } catch (e) {
            _sharp = false;
        }
    }
    if (!_sharp) {
        throw new Error('sharp nu este instalat (HEIC/EXIF indisponibil). Rulează: npm install sharp');
    }
    return _sharp;
}

/**
 * Normalize an image buffer for face detection:
 *  - Auto-orient from EXIF metadata (so a rotated photo is upright).
 *  - Decode HEIC/HEIF (iPhone) into JPEG.
 *
 * Returns:
 *   detectBuffer — oriented JPEG buffer, safe to feed face-api.
 *   storeBuffer  — what we actually store. For HEIC we store the converted
 *                  JPEG (universal display); for everything else we keep the
 *                  ORIGINAL bytes (no re-encode, full quality) since modern
 *                  viewers honor EXIF orientation.
 *   converted    — true when format changed (caller should rename to .jpg).
 */
async function prepareImage(buffer) {
    const sharp = getSharp();

    let format = '';
    try {
        const meta = await sharp(buffer).metadata();
        format = meta.format || '';
    } catch (_) {
        // Unknown/unreadable metadata — assume not heic.
    }

    const isHeic = ['heic', 'heif', 'avif'].includes(format);

    // Oriented JPEG used for detection (and storage when HEIC).
    const oriented = await sharp(buffer)
        .rotate()                 // auto-orient from EXIF
        .jpeg({ quality: 95 })
        .toBuffer();

    return {
        detectBuffer: oriented,
        storeBuffer: isHeic ? oriented : buffer,
        converted: isHeic,
    };
}

/** Swap a .heic/.heif/.avif extension to .jpg. */
function withJpgExt(name) {
    return name.replace(/\.(heic|heif|avif)$/i, '.jpg');
}

module.exports = { prepareImage, withJpgExt };
