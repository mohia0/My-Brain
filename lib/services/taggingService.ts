import nlp from 'compromise';
import rake from 'rake-js';

// Basic Smart Tagging Rules
const RULES = [
    { pattern: /https?:\/\//i, tag: 'link' },
    { pattern: /\.(jpg|jpeg|png|gif|webp)$/i, tag: 'image' },
    { pattern: /\.(mp4|mov|webm)$/i, tag: 'video' },
    { pattern: /\b(meeting|call|sync)\b/i, tag: 'meeting' },
    { pattern: /\b(idea|thought|brainstorm)\b/i, tag: 'idea' },
    { pattern: /\b(todo|task|action)\b/i, tag: 'todo' },
];

const ARABIC_STOP_WORDS = new Set([
    'في', 'من', 'على', 'إلى', 'عن', 'مع', 'هذا', 'هذه', 'تم', 'كان', 'كانت',
    'أن', 'ان', 'أو', 'لا', 'ما', 'لم', 'لن', 'هل', 'ثم', 'بين', 'كما', 'لكن',
    'جدا', 'ذلك', 'عبر', 'تحت', 'فوق', 'منذ', 'عند', 'بعد', 'قبل', 'حتى',
    'إذا', 'نحو', 'بي', 'له', 'لها', 'فيه', 'منه', 'علي', 'عليه', 'إلي', 'إليه',
    'التي', 'الذي', 'الذين', 'اللواتي', 'أنا', 'نحن', 'أنت', 'هو', 'هي', 'هم',
    'كل', 'بعض', 'غير', 'أي', 'يا', 'بلى', 'نعم', 'أجل', 'والذي', 'وان', 'فإن',
    'لو', 'لولا', 'كي', 'لكي', 'ليت', 'لعل', 'عسى', 'خلا', 'عدا', 'حاشا', 'فقط', 'وقد', 'حيث'
]);

const isArabic = (text: string) => /[\u0600-\u06FF]/.test(text);

const extractArabicKeywords = (text: string): string[] => {
    // 1. Normalize
    const normalized = text
        .replace(/[أإآ]/g, 'ا')
        .replace(/ى/g, 'ي')
        .replace(/ة/g, 'ه')
        .replace(/ـ/g, '') // Remove Tatweel (Elongation)
        .replace(/[ًٌٍَُِّْ]/g, ''); // Remove Tashkeel (Diacritics)

    // 2. Tokenize by space and punctuation
    // We treat anything non-arabic and non-alphanumeric as separator
    const tokens = normalized.split(/[^\u0600-\u06FF\w]+/);

    const frequency: Record<string, number> = {};

    tokens.forEach(token => {
        const word = token.trim();
        if (word.length < 3) return; // Ignore short words (2 chars or less)
        if (ARABIC_STOP_WORDS.has(word)) return; // Ignore stop words

        frequency[word] = (frequency[word] || 0) + 1;
    });

    // 3. Sort by frequency
    return Object.entries(frequency)
        .sort((a, b) => b[1] - a[1]) // Descending
        .slice(0, 5) // Take top 5
        .map(([word]) => word);
};

export const suggestTags = (text: string): string[] => {
    if (!text || text.length < 5) return [];

    const suggestions = new Set<string>();

    // 1. Rule-Based Extraction (Fastest)
    RULES.forEach(rule => {
        if (rule.pattern.test(text)) {
            suggestions.add(rule.tag);
        }
    });

    // 2. Arabic Handling
    if (isArabic(text)) {
        const arabicKeywords = extractArabicKeywords(text);
        arabicKeywords.forEach(k => suggestions.add(k));

        // If we found Arabic keywords, we generally delay RAKE to avoid mixing
        // But if result is sparse, we might let english flow through if mixed text
    }

    // 3. English/Latin Handling (RAKE + NLP)
    // We run this if text is NOT predominantly Arabic, or if we have mixed context
    // RAKE is chaotic with Arabic, so we try to feed it only non-arabic parts or skip if mainly Arabic
    if (!isArabic(text) || suggestions.size < 2) {
        try {
            const keyphrases = rake(text, {
                language: 'english',
                limit: 3,
            });

            keyphrases.forEach((phrase: string) => {
                // Heuristic: discard if it contains arabic chars (RAKE shouldn't output them, but just in case)
                if (isArabic(phrase)) return;

                if (phrase.length > 2 && phrase.length < 20) {
                    suggestions.add(phrase.toLowerCase().replace(/\s+/g, '-'));
                }
            });
        } catch (e) {
            console.warn("RAKE extraction failed", e);
        }

        // Fallback to Compromise (English NLP)
        if (suggestions.size < 3) {
            const doc = nlp(text);
            const topics = doc.topics().out('array');
            topics.forEach((topic: string) => {
                if (!isArabic(topic)) {
                    suggestions.add(topic.toLowerCase().replace(/\s+/g, '-'));
                }
            });
        }
    }

    return Array.from(suggestions).slice(0, 5);
};

export const extractTagsFromText = (text: string): { cleanText: string, tags: string[] } => {
    if (!text) return { cleanText: '', tags: [] };

    // Parse explicit hashtags like #design #google
    // Update regex to support Arabic letters in hashtags: #تصميم
    const hashtagRegex = /#([\w\u0600-\u06FF-]+)/g;
    const tags: string[] = [];
    const cleanText = text.replace(hashtagRegex, (match, tag) => {
        tags.push(tag.toLowerCase());
        return '';
    }).trim();

    return { cleanText, tags };
};
