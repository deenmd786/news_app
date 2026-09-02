const Parser = require('rss-parser');
const axios = require('axios');
const cheerio = require('cheerio');

const parser = new Parser({
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
    timeout: 15000,
});

const FEEDS = [
    { name: "NDTV India (YouTube)", category: "Video News", url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCpGLYV2okAEMUbnK7254sDQ" },
    { name: "India Today (YouTube)", category: "Video News", url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCYPvAwZP8pZhSMW8qs7cVCw" },
    { name: "The Hindu", category: "National", url: "https://www.thehindu.com/news/national/feeder/default.rss" },
    { name: "News18", category: "Top Stories", url: "https://www.news18.com/rss/india.xml" }
];

function cleanText(text) {
    if (!text) return "";
    return text.replace(/<[^>]*>?/gm, '').replace(/\s+/g, ' ').trim();
}

// 🧠 ENHANCED AUTO-CATEGORIZATION LOGIC (12+ Categories)
function categorizeNews(title, summary) {
    const text = (title + " " + summary).toLowerCase();

    // 1. Entertainment / Filmy
    if (text.match(/bollywood|hollywood|movie|cinema|actor|actress|film|celebrity|oscar|box office|trailer|netflix|prime|ott/)) return "Entertainment";

    // 2. Tech, AI & Gadgets
    if (text.match(/tech|ai|artificial intelligence|apple|google|samsung|app|software|smartphone|gadget|laptop|iphone|cyber/)) return "Technology";

    // 3. Sports
    if (text.match(/cricket|kohli|bcci|football|tennis|olympics|sports|medal|dhoni|rohit|fifa|world cup|ipl/)) return "Sports";

    // 4. Business & Finance
    if (text.match(/market|sensex|economy|rbi|bank|stocks|business|reliance|tata|startup|finance|invest|nifty|crypto/)) return "Business";

    // 5. Crime & Law
    if (text.match(/crime|murder|police|arrest|court|scam|fraud|criminal|jail|rape|cbi|ed|supreme court|smuggling/)) return "Crime";

    // 6. Politics
    if (text.match(/modi|bjp|congress|rahul|election|politics|govt|minister|parliament|mla|cm|pm|amit shah/)) return "Politics";

    // 7. World / International
    if (text.match(/world|us|china|pakistan|ukraine|russia|global|foreign|international|biden|putin|gaza|israel/)) return "World";

    // 8. Science & Environment
    if (text.match(/science|isro|nasa|space|climate|weather|earthquake|pollution|research|moon|mars|rain|monsoon/)) return "Science & Environment";

    // 9. Health & Lifestyle
    if (text.match(/health|disease|cancer|hospital|doctor|fitness|diet|lifestyle|yoga|virus|covid|vaccine/)) return "Health";

    // 10. Education & Jobs
    if (text.match(/education|school|exam|cbse|student|university|college|job|hiring|upsc|neet|jee|syllabus/)) return "Education";

    // 11. Auto & Vehicles
    if (text.match(/auto|car|bike|ev|tesla|mahindra|maruti|vehicle|motor|highway|driving/)) return "Auto";

    // 12. National / India (Fallback before General News)
    if (text.match(/india|delhi|mumbai|kerala|up|bihar|national|indian/)) return "National";

    return "General News"; // Default Fallback
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
                        if (!finalImage) finalImage = scrapedData.image; // Use scraped image if RSS had none
                    }
                }

                const publishedAt = item.isoDate || item.pubDate || new Date().toISOString();
                const summaryText = cleanText(item.contentSnippet || item.description || item.title);

                // Call Auto-Categorization
                const smartCategory = categorizeNews(item.title, summaryText);

                rawList.push({
                    id: Buffer.from(item.link || item.title).toString('base64').substring(0, 16),
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