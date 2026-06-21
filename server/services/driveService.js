const { google } = require('googleapis');
const path = require('path');
const fs = require('fs-extra');

const CREDENTIALS_PATH = path.join(__dirname, '../credentials.json');
const TOKEN_PATH = path.join(__dirname, '../token.json');

// Scopes required for Drive integration
const SCOPES = ['https://www.googleapis.com/auth/drive.file', 'https://www.googleapis.com/auth/drive.readonly'];

function getOAuth2Client() {
    if (!fs.existsSync(CREDENTIALS_PATH)) {
        throw new Error('credentials.json not found. Please download it from Google Cloud Console and place it in the server directory.');
    }
    
    const credentials = fs.readJsonSync(CREDENTIALS_PATH);
    const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web;
    // Fallback redirect URI if not defined
    const redirectUri = redirect_uris ? redirect_uris[0] : 'http://localhost:5000/api/drive/callback';
    return new google.auth.OAuth2(client_id, client_secret, redirectUri);
}

function getAuthUrl() {
    try {
        const oAuth2Client = getOAuth2Client();
        return oAuth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: SCOPES,
        });
    } catch (e) {
        console.error('Error generating auth url', e);
        return null;
    }
}

async function getAccessToken(code) {
    const oAuth2Client = getOAuth2Client();
    const { tokens } = await oAuth2Client.getToken(code);
    oAuth2Client.setCredentials(tokens);
    fs.writeJsonSync(TOKEN_PATH, tokens);
    return tokens;
}

function getDriveClient() {
    const oAuth2Client = getOAuth2Client();
    if (fs.existsSync(TOKEN_PATH)) {
        oAuth2Client.setCredentials(fs.readJsonSync(TOKEN_PATH));
    } else {
        throw new Error('Google Drive not authenticated. Please authenticate first.');
    }
    return google.drive({ version: 'v3', auth: oAuth2Client });
}

module.exports = {
    getAuthUrl,
    getAccessToken,
    getDriveClient,
    hasCredentials: () => fs.existsSync(CREDENTIALS_PATH),
    isAuthenticated: () => fs.existsSync(TOKEN_PATH)
};
