import dotenv from 'dotenv';
import env from 'env-var';

dotenv.config();

export const config = {
    service: {
        port: env.get('PORT').required().asPortNumber(),
    },
    mongo: {
        uri: env.get('MONGO_URI').required().asString(),
        userCollectionName: env.get('USER_COLLECTION').default('users').asString(),
    },
    cors: {
        origin: env.get('CORS_ORIGIN').required().asString(),
    },
    llm: {
        apiKey: env.get('LLM_API_KEY').required().asString(),
        baseUrl: env.get('LLM_BASE_URL').required().asString(),
        model: env.get('LLM_MODEL').required().asString(),
        timeout: env.get('LLM_TIMEOUT_MS').default('30000').asInt(), // 30 seconds
        rateLimit: {
            maxRequests: env.get('LLM_RATE_LIMIT_MAX').default('10').asInt(), // per window
            windowMs: env.get('LLM_RATE_LIMIT_WINDOW_MS').default('60000').asInt(), // 1 minute
        },
        cache: {
            enabled: env.get('LLM_CACHE_ENABLED').default('true').asBool(),
            ttlMs: env.get('LLM_CACHE_TTL_MS').default('300000').asInt(), // 5 minutes
        },
    },
    serper: {
        apiKey: env.get('SERPER_API_KEY').required().asString(),
    },
};
