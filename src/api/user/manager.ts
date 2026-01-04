import { DocumentNotFoundError, DuplicateEmailError } from '../../utils/errors';
import type { User, UserDocument } from './interface';
import { UserModel } from './model';

export class UserManager {
    static getByQuery = async (query: Partial<User>, step: number, limit?: number): Promise<UserDocument[]> => {
        return UserModel.find(query, {}, limit ? { limit, skip: limit * step } : {})
            .lean()
            .exec();
    };

    static getCount = async (query: Partial<User>): Promise<number> => {
        return UserModel.countDocuments(query).lean().exec();
    };

    static getById = async (userId: string): Promise<UserDocument> => {
        return UserModel.findById(userId).orFail(new DocumentNotFoundError(userId)).lean().exec();
    };

    static createOne = async (user: User): Promise<UserDocument> => {
        const existingUser = await UserModel.findOne({ email: user.email.toLowerCase() }).lean().exec();
        if (existingUser) {
            throw new DuplicateEmailError(user.email);
        }
        return UserModel.create(user);
    };

    static updateOne = async (userId: string, update: Partial<User>): Promise<UserDocument> => {
        return UserModel.findByIdAndUpdate(userId, update, { new: true }).orFail(new DocumentNotFoundError(userId)).lean().exec();
    };

    static deleteOne = async (userId: string): Promise<UserDocument> => {
        return UserModel.findByIdAndDelete(userId).orFail(new DocumentNotFoundError(userId)).lean().exec();
    };
}
