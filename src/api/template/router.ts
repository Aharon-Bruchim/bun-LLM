import { router, publicProcedure } from '../trpc';
import { TemplateManager } from './manager';
import {
    getByQuerySchema,
    getCountSchema,
    getByIdSchema,
    createOneSchema,
    updateOneSchema,
    deleteOneSchema,
} from './schema';

export const templateRouter = router({
    getByQuery: publicProcedure.input(getByQuerySchema).query(async ({ input }) => {
        const { step, limit, ...query } = input;
        return TemplateManager.getByQuery(query, step, limit);
    }),

    getCount: publicProcedure.input(getCountSchema).query(async ({ input }) => {
        return TemplateManager.getCount(input);
    }),

    getById: publicProcedure.input(getByIdSchema).query(async ({ input }) => {
        return TemplateManager.getById(input.id);
    }),

    createOne: publicProcedure.input(createOneSchema).mutation(async ({ input }) => {
        return TemplateManager.createOne(input);
    }),

    updateOne: publicProcedure.input(updateOneSchema).mutation(async ({ input }) => {
        return TemplateManager.updateOne(input.id, input.data);
    }),

    deleteOne: publicProcedure.input(deleteOneSchema).mutation(async ({ input }) => {
        return TemplateManager.deleteOne(input.id);
    }),
});
