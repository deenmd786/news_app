const fs = require('fs').promises;
const path = require('path');

const DATA_DIR = path.join(__dirname, '../../data');

// Ensure the data directory exists
async function ensureDir() {
    try {
        await fs.mkdir(DATA_DIR, { recursive: true });
    } catch (err) {
        console.error("Error creating data folder:", err);
    }
}

// Save news data to both a dated file and latest_news.json
async function saveNewsData(articles) {
    await ensureDir();
    const today = new Date().toISOString().split('T')[0];

    const payload = {
        updatedAt: new Date().toISOString(),
        totalCount: articles.length,
        articles
    };

    const dateFilePath = path.join(DATA_DIR, `news_${today}.json`);
    const latestFilePath = path.join(DATA_DIR, 'latest_news.json');

    await fs.writeFile(dateFilePath, JSON.stringify(payload, null, 2), 'utf-8');
    await fs.writeFile(latestFilePath, JSON.stringify(payload, null, 2), 'utf-8');

    console.log(`📁 News successfully saved to:`);
    console.log(`   - ${dateFilePath}`);
    console.log(`   - ${latestFilePath}`);

    return payload;
}

// Read the latest saved news
async function getLatestNews() {
    await ensureDir();
    const latestFilePath = path.join(DATA_DIR, 'latest_news.json');
    try {
        const fileContent = await fs.readFile(latestFilePath, 'utf-8');
        return JSON.parse(fileContent);
    } catch {
        return null; // File doesn't exist yet
    }
}

// Read news by date (YYYY-MM-DD)
async function getNewsByDate(dateStr) {
    await ensureDir();
    const filePath = path.join(DATA_DIR, `news_${dateStr}.json`);
    try {
        const fileContent = await fs.readFile(filePath, 'utf-8');
        return JSON.parse(fileContent);
    } catch {
        return null;
    }
}

module.exports = { saveNewsData, getLatestNews, getNewsByDate };