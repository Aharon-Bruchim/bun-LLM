interface RateLimitEntry {
    count: number;
    resetAt: number;
}

export class RateLimiter {
    private limits: Map<string, RateLimitEntry> = new Map();
    private maxRequests: number;
    private windowMs: number;

    constructor(maxRequests: number, windowMs: number) {
        this.maxRequests = maxRequests;
        this.windowMs = windowMs;
    }

    // בדיקה והגדלת counter - מחזיר true אם מותר
    check(key: string): { allowed: boolean; remaining: number; resetIn: number } {
        const now = Date.now();
        const entry = this.limits.get(key);

        // אין entry או שפג תוקף - יצירת חדש
        if (!entry || now > entry.resetAt) {
            this.limits.set(key, {
                count: 1,
                resetAt: now + this.windowMs,
            });
            return {
                allowed: true,
                remaining: this.maxRequests - 1,
                resetIn: this.windowMs,
            };
        }

        // יש entry בתוקף
        if (entry.count >= this.maxRequests) {
            return {
                allowed: false,
                remaining: 0,
                resetIn: entry.resetAt - now,
            };
        }

        // הגדלת counter
        entry.count++;
        return {
            allowed: true,
            remaining: this.maxRequests - entry.count,
            resetIn: entry.resetAt - now,
        };
    }

    // קבלת מצב בלי להגדיל counter
    getStatus(key: string): { remaining: number; resetIn: number } {
        const now = Date.now();
        const entry = this.limits.get(key);

        if (!entry || now > entry.resetAt) {
            return { remaining: this.maxRequests, resetIn: 0 };
        }

        return {
            remaining: Math.max(0, this.maxRequests - entry.count),
            resetIn: entry.resetAt - now,
        };
    }

    // איפוס ל-key ספציפי
    reset(key: string): void {
        this.limits.delete(key);
    }

    // ניקוי entries שפג תוקפם
    cleanup(): void {
        const now = Date.now();
        for (const [key, entry] of this.limits.entries()) {
            if (now > entry.resetAt) {
                this.limits.delete(key);
            }
        }
    }
}
