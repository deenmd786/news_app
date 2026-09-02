// src/services/newsService.js

const Parser = require('rss-parser');
const axios = require('axios');
const cheerio = require('cheerio');
const crypto = require('crypto'); // 👈 नया: यूनिक ID बनाने के लिए

// 📦 Import separated modules
const FEEDS = require('../config/feeds');
const { categorizeNews } = require('../utils/categorizer');

const parser = new Parser({
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
    timeout: 15000,
});

function cleanText(text) {
    if (!text) return "";
    return text.replace(/<[^>]*>?/gm, '').replace(/\s+/g, ' ').trim();
}

// 🌍 INTERNET IMAGE FALLBACK (Searches Bing Images via Cheerio)
async function searchImageForTitle(title) {
    try {
        const query = encodeURIComponent(title);
        const { data } = await axios.get(`https://www.bing.com/images/search?q=${query}`, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
            timeout: 5000
        });
        const $ = cheerio.load(data);
        const imgUrl = $('img.mimg').first().attr('src') || $('img.mimg').first().attr('data-src');
        return imgUrl || null;
    } catch (e) {
        return null;
    }
}

// 🚀 DEEP SCRAPER (Videos + Images)
async function scrapeWebpageForMedia(articleUrl, articleTitle) {
    let result = { video: null, platform: null, image: null };
    try {
        const { data: html } = await axios.get(articleUrl, {
            timeout: 8000,
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        const $ = cheerio.load(html);

        // 1. Extract Image (Open Graph)
        result.image = $('meta[property="og:image"]').attr('content') || $('meta[name="twitter:image"]').attr('content');

        // 2. Extract Video (Social/Iframes)
        const twitterEmbed = $('blockquote.twitter-tweet a').attr('href');
        if (twitterEmbed) { result.video = twitterEmbed; result.platform = "twitter"; }

        const instaEmbed = $('blockquote.instagram-media').attr('data-instgrm-permalink');
        if (!result.video && instaEmbed) { result.video = instaEmbed; result.platform = "instagram"; }

        const mp4Video = $('video source[type="video/mp4"]').attr('src');
        if (!result.video && mp4Video) { result.video = mp4Video; result.platform = "mp4"; }

    } catch (error) {
        // Silently handle block
    }

    // 🌐 If no image found on page, search the internet using the title
    if (!result.image) {
        result.image = await searchImageForTitle(articleTitle);
    }

    return result;
}

async function fetchAllNews(limitPerFeed = 10) {
    console.log("📡 Fetching and Deep-Scraping articles...");
    const rawList = [];

    const tasks = FEEDS.map(async (feed) => {
        try {
            const parsed = await parser.parseURL(feed.url);
            const items = parsed.items.slice(0, limitPerFeed);

            for (const item of items) {
                if (!item.title) continue;

                let finalVideoUrl = null;
                let finalPlatform = null;
                let finalImage = item.enclosure?.url || null; // Try RSS image first

                if (item.link && item.link.includes("youtube.com/watch")) {
                    finalVideoUrl = item.link;
                    finalPlatform = "youtube";
                    finalImage = `https://img.youtube.com/vi/${item.link.split('v=')[1]?.substring(0, 11)}/maxresdefault.jpg`;
                } else if (item.link) {
                    const scrapedData = await scrapeWebpageForMedia(item.link, item.title);
                    if (scrapedData) {
                        finalVideoUrl = scrapedData.video;
                        finalPlatform = scrapedData.platform;
                        if (!finalImage) finalImage = scrapedData.image;
                    }
                }

                // 🛑 STRICT MEDIA FILTER: Skip if no video AND no image
                if (!finalVideoUrl && !finalImage) {
                    console.log(`⏭️ Skipped (No Media Found): ${item.title}`);
                    continue;
                }

                const publishedAt = item.isoDate || item.pubDate || new Date().toISOString();
                const summaryText = cleanText(item.contentSnippet || item.description || item.title);

                // 🧠 Call Auto-Categorization (From external file)
                const smartCategory = categorizeNews(item.title, summaryText);

                const uniqueString = item.link || item.title;
                const uniqueId = crypto.createHash('md5').update(uniqueString).digest('hex').substring(0, 16);

                rawList.push({
                    id: uniqueId,
                    title: item.title.trim(),
                    summary: summaryText.slice(0, 350),
                    link: item.link || "",
                    source: feed.name,
                    category: smartCategory, // Assigned Smart Category
                    media: {
                        image: finalImage,
                        video: finalVideoUrl,
                        videoType: finalPlatform
                    },
                    publishedAt
                });
            }
        } catch (err) {
            console.error(`❌ Failed [${feed.name}]:`, err.message);
        }
    });

    await Promise.all(tasks);
    return rawList;
}

module.exports = { fetchAllNews };