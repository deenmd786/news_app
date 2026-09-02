require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { fetchAllNews } = require('./src/services/newsService');
const { saveNewsData, getLatestNews } = require('./src/utils/fileManager');
const { pushToGitHub } = require('./src/services/githubService'); // Import GitHub Service

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// 1. GET Latest News
app.get('/api/news/latest', async (req, res) => {
    try {
        let data = await getLatestNews();

        // If completely empty, fetch, save, and push to GitHub
        if (!data) {
            console.log("Initial load. Fetching data...");
            const freshArticles = await fetchAllNews();
            data = await saveNewsData(freshArticles);

            // 🚀 PUSH TO GITHUB
            await pushToGitHub(data);
        }

        const { category, limit } = req.query;
        let articles = data.articles;

        if (category) {
            articles = articles.filter(a => a.category.toLowerCase() === category.toLowerCase());
        }
        if (limit) {
            articles = articles.slice(0, parseInt(limit, 10));
        }

        res.json({ success: true, updatedAt: data.updatedAt, count: articles.length, articles });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 2. POST / Refresh Now
app.post('/api/news/refresh', async (req, res) => {
    try {
        console.log("🔄 Manual refresh triggered...");
        const newArticles = await fetchAllNews();
        const savedData = await saveNewsData(newArticles);

        // 🚀 PUSH BOTH FILES TO GITHUB
        const today = new Date().toISOString().split('T')[0];
        await pushToGitHub(savedData, 'data/latest_news.json');
        await pushToGitHub(savedData, `data/news_${today}.json`);

        res.json({
            success: true,
            message: "News fetched, deduplicated, saved, and pushed to GitHub.",
            count: savedData.totalCount,
            updatedAt: savedData.updatedAt
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 News Server running on http://localhost:${PORT}`);
});