import { Types } from 'mongoose';
import { ChatSessionModel } from './model';
import type { ChatMessage } from './interface';

export class ChatHistoryManager {
    /**
     * Create a new chat session for a user
     */
    static async createSession(userId: string) {
        const session = new ChatSessionModel({
            userId: new Types.ObjectId(userId),
            messages: [],
            toolsUsed: [],
        });
        return session.save();
    }

    /**
     * Add a message to an existing session
     */
    static async addMessage(sessionId: string, message: Omit<ChatMessage, 'timestamp'>) {
        return ChatSessionModel.findByIdAndUpdate(
            sessionId,
            {
                $push: {
                    messages: {
                        ...message,
                        timestamp: new Date(),
                    },
                },
            },
            { new: true }
        );
    }

    /**
     * Add user and assistant messages in one operation
     */
    static async addConversation(
        sessionId: string,
        userMessage: string,
        assistantMessage: string,
        toolsUsed?: string[]
    ) {
        const update: Record<string, unknown> = {
            $push: {
                messages: {
                    $each: [
                        { role: 'user', content: userMessage, timestamp: new Date() },
                        { role: 'assistant', content: assistantMessage, timestamp: new Date() },
                    ],
                },
            },
        };

        if (toolsUsed && toolsUsed.length > 0) {
            update['$addToSet'] = { toolsUsed: { $each: toolsUsed } };
        }

        return ChatSessionModel.findByIdAndUpdate(sessionId, update, { new: true });
    }

    /**
     * Create a session and add a conversation in one call
     */
    static async logConversation(
        userId: string,
        userMessage: string,
        assistantMessage: string,
        toolsUsed?: string[]
    ) {
        const session = new ChatSessionModel({
            userId: new Types.ObjectId(userId),
            messages: [
                { role: 'user', content: userMessage, timestamp: new Date() },
                { role: 'assistant', content: assistantMessage, timestamp: new Date() },
            ],
            toolsUsed: toolsUsed || [],
        });
        return session.save();
    }

    /**
     * Get chat history for a user
     */
    static async getByUserId(userId: string, limit = 50, skip = 0) {
        return ChatSessionModel.find({ userId: new Types.ObjectId(userId) })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();
    }

    /**
     * Get a specific session by ID
     */
    static async getById(sessionId: string) {
        return ChatSessionModel.findById(sessionId).lean();
    }

    /**
     * Get recent sessions across all users (for admin)
     */
    static async getRecent(limit = 100) {
        return ChatSessionModel.find()
            .sort({ createdAt: -1 })
            .limit(limit)
            .populate('userId', 'name email')
            .lean();
    }

    /**
     * Delete old sessions (cleanup)
     */
    static async deleteOlderThan(days: number) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);
        return ChatSessionModel.deleteMany({ createdAt: { $lt: cutoffDate } });
    }
}
