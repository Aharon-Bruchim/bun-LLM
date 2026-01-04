import { z } from 'zod';

export const chatSchema = z.object({
    message: z.string().min(1).max(10000),
});

export const chatResponseSchema = z.object({
    answer: z.string(),
    toolsUsed: z.array(
        z.object({
            name: z.string(),
            args: z.unknown(),
            result: z.object({
                success: z.boolean(),
                data: z.unknown().optional(),
                error: z.string().optional(),
            }),
        })
    ),
    iterations: z.number(),
});
