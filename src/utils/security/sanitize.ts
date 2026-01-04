// רשימת MongoDB operators שצריך לחסום
const MONGO_OPERATORS = [
    '$gt',
    '$gte',
    '$lt',
    '$lte',
    '$ne',
    '$in',
    '$nin',
    '$or',
    '$and',
    '$not',
    '$nor',
    '$exists',
    '$type',
    '$mod',
    '$regex',
    '$where',
    '$text',
    '$search',
    '$geoWithin',
    '$geoIntersects',
    '$near',
    '$nearSphere',
    '$all',
    '$elemMatch',
    '$size',
    '$expr',
    '$jsonSchema',
];

// מניעת NoSQL injection
export function sanitizeMongoQuery(input: unknown): unknown {
    if (typeof input === 'string') {
        // בדיקה שאין operators בתוך string
        for (const op of MONGO_OPERATORS) {
            if (input.includes(op)) {
                throw new Error('Invalid input: MongoDB operator detected');
            }
        }
        return input;
    }

    if (Array.isArray(input)) {
        return input.map(sanitizeMongoQuery);
    }

    if (input !== null && typeof input === 'object') {
        const sanitized: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(input)) {
            // חסימת keys שמתחילים ב-$
            if (key.startsWith('$')) {
                throw new Error('Invalid input: MongoDB operator in key');
            }
            sanitized[key] = sanitizeMongoQuery(value);
        }
        return sanitized;
    }

    return input;
}

// דפוסים מסוכנים של prompt injection
const DANGEROUS_PATTERNS = [
    /ignore\s+(previous|above|all)\s+instructions?/gi,
    /disregard\s+(previous|above|all)\s+instructions?/gi,
    /forget\s+(previous|above|all)\s+instructions?/gi,
    /system\s*:/gi,
    /\[INST\]/gi,
    /<\|im_start\|>/gi,
    /<\|im_end\|>/gi,
    /<<SYS>>/gi,
    /<\/SYS>>/gi,
    /you\s+are\s+now\s+/gi,
    /new\s+instructions?\s*:/gi,
];

// סניטציה של טקסט לפני שליחה ל-LLM
export function sanitizeForLLM(input: string): string {
    let sanitized = input;
    for (const pattern of DANGEROUS_PATTERNS) {
        sanitized = sanitized.replace(pattern, '[FILTERED]');
    }
    return sanitized;
}

// escape לתווים מיוחדים ב-regex
export function escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// בדיקה שערך הוא safe string
export function isSafeString(value: unknown): value is string {
    if (typeof value !== 'string') return false;
    if (value.length > 10000) return false;

    // בדיקת תווים לא בטוחים
    const unsafeChars = /[\x00-\x1f\x7f]/;
    return !unsafeChars.test(value);
}
