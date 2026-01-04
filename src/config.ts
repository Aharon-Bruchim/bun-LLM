import dotenv from 'dotenv';
import env from 'env-var';

dotenv.config();

export const config = {
    service: {
        port: env.get('PORT').required().asPortNumber(),
    },
    mongo: {
        uri: env.get('MONGO_URI').required().asString(),
        templateCollectionName: env.get('TEMPLATE_SERVICE').required().asString(),
    },
    cors: {
        origin: env.get('CORS_ORIGIN').required().asString(),
    },
};
