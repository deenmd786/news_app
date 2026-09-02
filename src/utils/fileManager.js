const fs = require('fs').promises;
const path = require('path');

const DATA_DIR = path.join(__dirname, '../../data');

async function ensureDir() {
    try { await fs.mkdir(DATA_DIR, { recursive: true }); } catch (err) { }
}

async function getLatestNews() {
    await ensureDir();
    const latestFilePath = path.join(DATA_DIR, 'latest_news.json');
    try {
        const fileContent = await fs.readFile(latestFilePath, 'utf-8');
        return JSON.parse(fileContent);
    } catch {
        return null;
    }
}

// 🛡️ DEDUPLICATION & MERGE LOGIC
async function saveNewsData(newArticles) {
    await ensureDir();
    const today = new Date().toISOString().split('T')[0];

    // Fetch existing articles
    const existingData = await getLatestNews();
    const existingArticles = existingData ? existingData.articles : [];

    // Use a Map to prevent duplicates (Key = Article ID)
    const articleMap = new Map();

    // Add old articles first
    existingArticles.forEach(art => articleMap.set(art.id, art));

    // Overwrite/Add new articles (keeps the freshest data)
    newArticles.forEach(art => articleMap.set(art.id, art));

    // Convert Map back to array and sort by Date (Newest first)
    const mergedArticles = Array.from(articleMap.values()).sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

    const payload = {
        updatedAt: new Date().toISOString(),
        totalCount: mergedArticles.length,
        articles: mergedArticles
    };

    const dateFilePath = path.join(DATA_DIR, `news_${today}.json`);
    const latestFilePath = path.join(DATA_DIR, 'latest_news.json');

    await fs.writeFile(dateFilePath, JSON.stringify(payload, null, 2), 'utf-8');
    await fs.writeFile(latestFilePath, JSON.stringify(payload, null, 2), 'utf-8');

    return payload;
}

module.exports = { saveNewsData, getLatestNews };