require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { fetchAllNews, fetchOgFallback } = require('./src/services/newsService');
const { saveNewsData, getLatestNews, getNewsByDate } = require('./src/utils/fileManager');

const app = express();
const PORT = process.env.PORT || 4000;

// Enable CORS so websites and apps can fetch directly
app.use(cors());
app.use(express.json());

// 1. Root overview
app.get('/', (req, res) => {
    res.json({
        service: "News & Media API Server",
        status: "Active",
        endpoints: {
            getLatest: "GET /api/news/latest",
            getByDate: "GET /api/news/archive?date=YYYY-MM-DD",
            refreshNow: "POST /api/news/refresh",
            resolveMedia: "POST /api/news/resolve-og"
        }
    });
});

// 2. GET Latest News (Serves from data/latest_news.json for sub-10ms response times)
app.get('/api/news/latest', async (req, res) => {
    try {
        let data = await getLatestNews();

        // If no file exists yet, fetch live and create it
        if (!data) {
            console.log("No existing data found. Running initial fetch...");
            const freshArticles = await fetchAllNews();
            data = await saveNewsData(freshArticles);
        }

        const { category, limit } = req.query;
        let articles = data.articles;

        if (category) {
            articles = articles.filter(a => a.category.toLowerCase() === category.toLowerCase());
        }

        if (limit) {
            articles = articles.slice(0, parseInt(limit, 10));
        }

        res.json({
            success: true,
            updatedAt: data.updatedAt,
            count: articles.length,
            articles
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 3. GET Archived News by Date (e.g. ?date=2026-09-02)
app.get('/api/news/archive', async (req, res) => {
    try {
        const date = req.query.date;
        if (!date) {
            return res.status(400).json({ success: false, message: "Please provide a 'date' query parameter (YYYY-MM-DD)." });
        }

        const data = await getNewsByDate(date);
        if (!data) {
            return res.status(404).json({ success: false, message: `No data found for date: ${date}` });
        }

        res.json({ success: true, ...data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 4. POST / Refresh Now (Triggers fetch, media extraction, and updates data/ folder)
app.post('/api/news/refresh', async (req, res) => {
    try {
        console.log("🔄 Manual refresh triggered...");
        const articles = await fetchAllNews();
        const saved = await saveNewsData(articles);

        res.json({
            success: true,
            message: "News and media fetched and saved to data folder successfully.",
            count: saved.totalCount,
            updatedAt: saved.updatedAt
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 5. POST / Resolve OG Image (For individual articles missing thumbnails)
app.post('/api/news/resolve-og', async (req, res) => {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: "URL is required" });

    const media = await fetchOgFallback(url);
    res.json({ success: true, media });
});

app.listen(PORT, () => {
    console.log(`🚀 News Server is running on http://localhost:${PORT}`);
});