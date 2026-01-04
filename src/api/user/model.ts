import mongoose from 'mongoose';
import { config } from '../../config';
import type { UserDocument } from './interface';

const UserSchema = new mongoose.Schema<UserDocument>(
    {
        name: {
            type: String,
            required: true,
        },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },
        isAdmin: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
        versionKey: false,
    },
);

export const UserModel = mongoose.model<UserDocument>(config.mongo.userCollectionName, UserSchema);
