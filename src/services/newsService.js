const Parser = require('rss-parser');
const axios = require('axios');
const cheerio = require('cheerio');

const parser = new Parser({
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
    timeout: 15000,
});

const FEEDS = [
    // 1. YouTube News Feeds (Working IDs)
    { name: "NDTV India (YouTube)", category: "Video News", url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCpGLYV2okAEMUbnK7254sDQ" },
    { name: "India Today (YouTube)", category: "Video News", url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCYPvAwZP8pZhSMW8qs7cVCw" },
    { name: "Aaj Tak (YouTube)", category: "Video News", url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCt4t-jeY85JegMlZ-E5UWtA" },

    // 2. Standard Feeds (We will Deep Scrape these for Twitter/Insta/FB videos)
    { name: "The Hindu (National)", category: "National", url: "https://www.thehindu.com/news/national/feeder/default.rss" },
    { name: "Firstpost (India)", category: "Top Stories", url: "https://www.firstpost.com/rss/india.xml" },
    { name: "News18 (Tech)", category: "Science & Tech", url: "https://www.news18.com/rss/tech.xml" }
];

function cleanText(text) {
    if (!text) return "";
    return text.replace(/<[^>]*>?/gm, '').replace(/\s+/g, ' ').trim();
}

/**
 * 🚀 NEW: DEEP SCRAPER
 * Visits the actual news website URL and hunts for embedded social media and videos
 */
async function scrapeWebpageForVideo(articleUrl) {
    try {
        // Fetch the actual HTML of the news article
        const { data: html } = await axios.get(articleUrl, {
            timeout: 8000, // 8 seconds max so we don't hang the server
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
        });

        const $ = cheerio.load(html);
        let video = null;
        let platform = null;

        // 1. Check for Twitter (X) Embeds
        const twitterEmbed = $('blockquote.twitter-tweet a').attr('href');
        if (twitterEmbed) {
            return { video: twitterEmbed, platform: "twitter" };
        }

        // 2. Check for Instagram Embeds
        const instaEmbed = $('blockquote.instagram-media').attr('data-instgrm-permalink') || $('iframe[src*="instagram.com/p/"]').attr('src');
        if (instaEmbed) {
            return { video: instaEmbed, platform: "instagram" };
        }

        // 3. Check for Facebook Embeds
        const fbEmbed = $('iframe[src*="facebook.com/plugins/video"]').attr('src');
        if (fbEmbed) {
            // Decode the Facebook iframe URL to get the actual video link
            const decodedUrl = decodeURIComponent(fbEmbed);
            const match = decodedUrl.match(/href=([^&]+)/);
            return { video: match ? match[1] : fbEmbed, platform: "facebook" };
        }

        // 4. Check for Raw MP4 Files
        const mp4Video = $('video source[type="video/mp4"]').attr('src') || $('video[src$=".mp4"]').attr('src');
        if (mp4Video) {
            return { video: mp4Video.startsWith('//') ? 'https:' + mp4Video : mp4Video, platform: "mp4" };
        }

        // 5. Check for Private News Player Iframes (Dailymotion, Vimeo, Custom)
        $('iframe').each((i, el) => {
            const src = $(el).attr('src');
            if (src && !video && (src.includes('dailymotion.com') || src.includes('vimeo.com') || src.includes('player'))) {
                video = src;
                platform = src.includes('dailymotion') ? "dailymotion" : src.includes('vimeo') ? "vimeo" : "iframe";
            }
        });

        if (video) return { video, platform };

        return null; // No video found on this webpage
    } catch (error) {
        // Silently fail if the website blocks our scraper (e.g. 403 Forbidden)
        return null;
    }
}

async function fetchAllNews(limitPerFeed = 10) {
    console.log("📡 Fetching and Deep-Scraping articles across all feeds...");
    const rawList = [];

    const tasks = FEEDS.map(async (feed) => {
        try {
            const parsed = await parser.parseURL(feed.url);
            const items = parsed.items.slice(0, limitPerFeed);

            for (const item of items) {
                if (!item.title) continue;

                let finalVideoUrl = null;
                let finalPlatform = null;

                // 1. Is it a YouTube feed?
                if (item.link && item.link.includes("youtube.com/watch")) {
                    finalVideoUrl = item.link;
                    finalPlatform = "youtube";
                }
                // 2. If it's a standard news feed, DEEP SCRAPE the website!
                else if (item.link) {
                    const scrapedData = await scrapeWebpageForVideo(item.link);
                    if (scrapedData) {
                        finalVideoUrl = scrapedData.video;
                        finalPlatform = scrapedData.platform;
                    }
                }

                // 🛑 STRICT FILTER: If no video was found even after deep scraping, skip it!
                if (!finalVideoUrl) continue;

                const publishedAt = item.isoDate || item.pubDate || new Date().toISOString();

                rawList.push({
                    id: Buffer.from(item.link || item.title).toString('base64').substring(0, 16),
                    title: item.title.trim(),
                    summary: cleanText(item.contentSnippet || item.description || item.title).slice(0, 350),
                    link: item.link || "",
                    source: feed.name,
                    category: feed.category,
                    media: {
                        image: null,
                        video: finalVideoUrl,
                        videoType: finalPlatform // 'twitter', 'instagram', 'facebook', 'mp4', etc.
                    },
                    publishedAt
                });
            }
        } catch (err) {
            console.error(`❌ Failed to parse [${feed.name}]:`, err.message);
        }
    });

    await Promise.all(tasks);

    // Deduplicate
    const seen = new Set();
    const unique = [];
    for (const art of rawList) {
        const key = art.title.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (!seen.has(key)) {
            seen.add(key);
            unique.push(art);
        }
    }

    return unique;
}

module.exports = { fetchAllNews };