// src/utils/categorizer.js

// 🧠 ENHANCED AUTO-CATEGORIZATION LOGIC (12+ Categories)
function categorizeNews(title, summary) {
    const text = (title + " " + summary).toLowerCase();

    if (text.match(/bollywood|hollywood|movie|cinema|actor|actress|film|celebrity|oscar|box office|trailer|netflix|prime|ott/)) return "Entertainment";
    if (text.match(/tech|ai|artificial intelligence|apple|google|samsung|app|software|smartphone|gadget|laptop|iphone|cyber/)) return "Technology";
    if (text.match(/cricket|kohli|bcci|football|tennis|olympics|sports|medal|dhoni|rohit|fifa|world cup|ipl/)) return "Sports";
    if (text.match(/market|sensex|economy|rbi|bank|stocks|business|reliance|tata|startup|finance|invest|nifty|crypto/)) return "Business";
    if (text.match(/crime|murder|police|arrest|court|scam|fraud|criminal|jail|rape|cbi|ed|supreme court|smuggling/)) return "Crime";
    if (text.match(/modi|bjp|congress|rahul|election|politics|govt|minister|parliament|mla|cm|pm|amit shah/)) return "Politics";
    if (text.match(/world|us|china|pakistan|ukraine|russia|global|foreign|international|biden|putin|gaza|israel/)) return "World";
    if (text.match(/science|isro|nasa|space|climate|weather|earthquake|pollution|research|moon|mars|rain|monsoon/)) return "Science & Environment";
    if (text.match(/health|disease|cancer|hospital|doctor|fitness|diet|lifestyle|yoga|virus|covid|vaccine/)) return "Health";
    if (text.match(/education|school|exam|cbse|student|university|college|job|hiring|upsc|neet|jee|syllabus/)) return "Education";
    if (text.match(/auto|car|bike|ev|tesla|mahindra|maruti|vehicle|motor|highway|driving/)) return "Auto";
    if (text.match(/india|delhi|mumbai|kerala|up|bihar|national|indian/)) return "National";

    return "General News"; // Default Fallback
}

module.exports = { categorizeNews };