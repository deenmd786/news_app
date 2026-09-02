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

// 🆕 नया: किसी खास दिन की फाइल को पढ़ने का फंक्शन
async function getNewsByDate(dateStr) {
    await ensureDir();
    const filePath = path.join(DATA_DIR, `news_${dateStr}.json`);
    try {
        const fileContent = await fs.readFile(filePath, 'utf-8');
        return JSON.parse(fileContent);
    } catch {
        return null; // फाइल नहीं मिली (आज की पहली रन है)
    }
}

// 🛠️ डुप्लीकेट हटाने और मर्ज (Append) करने का हेल्पर फंक्शन
function mergeArticles(oldArticles, newArticles) {
    const articleMap = new Map();
    // पुरानी न्यूज़ डालें
    oldArticles.forEach(art => articleMap.set(art.id, art));
    // नई न्यूज़ डालें (अगर ID सेम होगी, तो नई वाली पुरानी को रिप्लेस कर देगी)
    newArticles.forEach(art => articleMap.set(art.id, art));

    // डेट के हिसाब से शॉर्ट (Sort) करें (नयी न्यूज़ सबसे ऊपर)
    return Array.from(articleMap.values()).sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
}

// 🛡️ मुख्य सेव फंक्शन
async function saveNewsData(newArticles) {
    await ensureDir();
    const today = new Date().toISOString().split('T')[0];

    // ----------------------------------------------------
    // STEP 1: LATEST NEWS को अपडेट करें (Rolling Feed)
    // ----------------------------------------------------
    const existingLatestData = await getLatestNews();
    const existingLatestArticles = existingLatestData ? existingLatestData.articles : [];

    // मर्ज करें और लिमिट लगा दें (ताकि फाइल बहुत ज्यादा बड़ी न हो जाए, जैसे मैक्स 200 न्यूज़)
    const mergedLatest = mergeArticles(existingLatestArticles, newArticles).slice(0, 200);

    const latestPayload = {
        updatedAt: new Date().toISOString(),
        totalCount: mergedLatest.length,
        articles: mergedLatest
    };

    // ----------------------------------------------------
    // STEP 2: आज की DAILY FILE को अपडेट करें (Append logic)
    // ----------------------------------------------------
    const existingDailyData = await getNewsByDate(today);
    const existingDailyArticles = existingDailyData ? existingDailyData.articles : [];

    // इसमें कोई लिमिट नहीं है, आज की सारी न्यूज़ इसमें अपेंड (Append) होती रहेंगी
    const mergedDaily = mergeArticles(existingDailyArticles, newArticles);

    const dailyPayload = {
        updatedAt: new Date().toISOString(),
        totalCount: mergedDaily.length,
        articles: mergedDaily
    };

    // ----------------------------------------------------
    // STEP 3: दोनों फाइलों को सेव करें
    // ----------------------------------------------------
    const latestFilePath = path.join(DATA_DIR, 'latest_news.json');
    const dateFilePath = path.join(DATA_DIR, `news_${today}.json`);

    await fs.writeFile(latestFilePath, JSON.stringify(latestPayload, null, 2), 'utf-8');
    await fs.writeFile(dateFilePath, JSON.stringify(dailyPayload, null, 2), 'utf-8');

    // सर्वर को दोनों पेलोड (Payloads) वापस भेजें ताकि वह गिटहब पर अलग-अलग पुश कर सके
    return { latestPayload, dailyPayload, today };
}

module.exports = { saveNewsData, getLatestNews, getNewsByDate };