import type { Document, Types } from 'mongoose';

export interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

export interface ChatSession {
    userId: Types.ObjectId;
    messages: ChatMessage[];
    toolsUsed: string[];
    totalTokens?: number;
    createdAt: Date;
    updatedAt: Date;
}

export interface ChatSessionDocument extends ChatSession, Document {}
