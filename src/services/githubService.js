const axios = require('axios');
require('dotenv').config();

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const REPO_OWNER = process.env.GITHUB_OWNER; // deenmd786
const REPO_NAME = process.env.GITHUB_REPO;   // news_app

// 🆕 अब यह फंक्शन filePath भी लेगा (ताकि हम latest और daily दोनों फाइल्स पुश कर सकें)
async function pushToGitHub(jsonData, filePath) {
    if (!GITHUB_TOKEN || !REPO_OWNER || !REPO_NAME) {
        console.log(`⚠️ GitHub credentials missing. Skipping push for ${filePath}.`);
        return;
    }

    const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${filePath}`;
    const headers = {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json'
    };

    try {
        // 1. Check if file already exists to get its 'sha'
        let sha = null;
        try {
            const { data } = await axios.get(url, { headers });
            sha = data.sha;
        } catch (error) {
            if (error.response && error.response.status !== 404) throw error;
        }

        // 2. Prepare payload
        const content = Buffer.from(JSON.stringify(jsonData, null, 2)).toString('base64');
        const body = {
            message: `Auto-update: ${filePath} at ${new Date().toISOString()}`,
            content: content,
            ...(sha && { sha })
        };

        // 3. Push to GitHub
        await axios.put(url, body, { headers });
        console.log(`✅ Successfully pushed ${filePath} to GitHub!`);
    } catch (error) {
        console.error(`❌ Failed to push ${filePath} to GitHub:`, error.response?.data || error.message);
    }
}

module.exports = { pushToGitHub };