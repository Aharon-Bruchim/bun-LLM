import { router, publicProcedure } from '../trpc';
import { UserManager } from './manager';
import { getByQuerySchema, getCountSchema, getByIdSchema, createOneSchema, updateOneSchema, deleteOneSchema } from './schema';

export const userRouter = router({
    getByQuery: publicProcedure.input(getByQuerySchema).query(async ({ input }) => {
        const { step, limit, ...query } = input;
        return UserManager.getByQuery(query, step, limit);
    }),

    getCount: publicProcedure.input(getCountSchema).query(async ({ input }) => {
        return UserManager.getCount(input);
    }),

    getById: publicProcedure.input(getByIdSchema).query(async ({ input }) => {
        return UserManager.getById(input.id);
    }),

    createOne: publicProcedure.input(createOneSchema).mutation(async ({ input }) => {
        return UserManager.createOne(input);
    }),

    updateOne: publicProcedure.input(updateOneSchema).mutation(async ({ input }) => {
        return UserManager.updateOne(input.id, input.data);
    }),

    deleteOne: publicProcedure.input(deleteOneSchema).mutation(async ({ input }) => {
        return UserManager.deleteOne(input.id);
    }),
});
