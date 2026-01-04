import mongoose from 'mongoose';
import { config } from '../../config';
import type { TemplateDocument } from './interface';

const TemplateSchema = new mongoose.Schema<TemplateDocument>(
    {
        name: {
            type: String,
            required: true,
        },
        email: {
            type: String,
        },
    },
    {
        versionKey: false,
    },
);

export const TemplateModel = mongoose.model<TemplateDocument>(config.mongo.templateCollectionName, TemplateSchema);
