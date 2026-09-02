// src/config/feeds.js

const FEEDS = [
    // 📺 Verified YouTube Video Feeds
    { name: "Aaj Tak", category: "Video News", url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCt4t-jeY85JegMlZ-E5UWtA" },
    { name: "Zee News", category: "Video News", url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCIvaYmXn910QMdemBG3v1pQ" },
    { name: "India TV", category: "Video News", url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCttspZesZIDEwwpVIgoZtWQ" },

    // 📰 Standard Article Feeds
    { name: "The Hindu", category: "National", url: "https://www.thehindu.com/news/national/feeder/default.rss" },
    { name: "News18 India", category: "Top Stories", url: "https://www.news18.com/rss/india.xml" },
    { name: "NDTV English", category: "Top Stories", url: "https://feeds.feedburner.com/ndtvnews-top-stories" }
];

module.exports = FEEDS;