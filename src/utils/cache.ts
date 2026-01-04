import { createHash } from 'crypto';

interface CacheEntry<T> {
    value: T;
    expiresAt: number;
}

export class SimpleCache<T> {
    private cache: Map<string, CacheEntry<T>> = new Map();
    private ttlMs: number;

    constructor(ttlMs: number) {
        this.ttlMs = ttlMs;
    }

    // יצירת מפתח hash מהקלט
    static createKey(input: unknown): string {
        const str = JSON.stringify(input);
        return createHash('sha256').update(str).digest('hex').slice(0, 16);
    }

    get(key: string): T | null {
        const entry = this.cache.get(key);
        if (!entry) return null;

        // בדיקת תוקף
        if (Date.now() > entry.expiresAt) {
            this.cache.delete(key);
            return null;
        }

        return entry.value;
    }

    set(key: string, value: T): void {
        this.cache.set(key, {
            value,
            expiresAt: Date.now() + this.ttlMs,
        });
    }

    has(key: string): boolean {
        return this.get(key) !== null;
    }

    delete(key: string): void {
        this.cache.delete(key);
    }

    clear(): void {
        this.cache.clear();
    }

    // ניקוי entries שפג תוקפם
    cleanup(): void {
        const now = Date.now();
        for (const [key, entry] of this.cache.entries()) {
            if (now > entry.expiresAt) {
                this.cache.delete(key);
            }
        }
    }

    get size(): number {
        return this.cache.size;
    }
}
