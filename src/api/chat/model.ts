import mongoose from 'mongoose';
import type { ChatSessionDocument } from './interface';

const ChatMessageSchema = new mongoose.Schema(
    {
        role: {
            type: String,
            enum: ['user', 'assistant'],
            required: true,
        },
        content: {
            type: String,
            required: true,
        },
        timestamp: {
            type: Date,
            default: Date.now,
        },
    },
    { _id: false }
);

const ChatSessionSchema = new mongoose.Schema<ChatSessionDocument>(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'users',
            required: true,
            index: true,
        },
        messages: {
            type: [ChatMessageSchema],
            default: [],
        },
        toolsUsed: {
            type: [String],
            default: [],
        },
        totalTokens: {
            type: Number,
            default: 0,
        },
    },
    {
        timestamps: true,
        versionKey: false,
    }
);

// Index for efficient queries by user and date
ChatSessionSchema.index({ userId: 1, createdAt: -1 });

export const ChatSessionModel = mongoose.model<ChatSessionDocument>('chat_history', ChatSessionSchema);
