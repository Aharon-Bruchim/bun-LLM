import { router, publicProcedure } from '../trpc';
import { orchestrator } from './orchestrator';
import { chatSchema } from './schema';
import { randomUUID } from 'crypto';

export const llmRouter = router({
    chat: publicProcedure.input(chatSchema).mutation(async ({ input, ctx }) => {
        const context = {
            user: ctx.user
                ? {
                      id: ctx.user._id,
                      email: ctx.user.email,
                      name: ctx.user.name,
                      isAdmin: ctx.user.isAdmin,
                  }
                : null,
            requestId: randomUUID(),
        };

        return orchestrator.chat(input.message, context);
    }),
});
