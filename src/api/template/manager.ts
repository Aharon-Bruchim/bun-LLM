import { DocumentNotFoundError, DuplicateEmailError } from '../../utils/errors';
import type { Template, TemplateDocument } from './interface';
import { TemplateModel } from './model';

export class TemplateManager {
    static getByQuery = async (query: Partial<Template>, step: number, limit?: number): Promise<TemplateDocument[]> => {
        return TemplateModel.find(query, {}, limit ? { limit, skip: limit * step } : {})
            .lean()
            .exec();
    };

    static getCount = async (query: Partial<Template>): Promise<number> => {
        return TemplateModel.countDocuments(query).lean().exec();
    };

    static getById = async (templateId: string): Promise<TemplateDocument> => {
        return TemplateModel.findById(templateId).orFail(new DocumentNotFoundError(templateId)).lean().exec();
    };

    static createOne = async (template: Template): Promise<TemplateDocument> => {
        const existingTemplate = await TemplateModel.findOne({ email: template.email }).lean().exec();
        if (existingTemplate) {
            throw new DuplicateEmailError(template.email);
        }
        return TemplateModel.create(template);
    };

    static updateOne = async (templateId: string, update: Partial<Template>): Promise<TemplateDocument> => {
        return TemplateModel.findByIdAndUpdate(templateId, update, { new: true }).orFail(new DocumentNotFoundError(templateId)).lean().exec();
    };

    static deleteOne = async (templateId: string): Promise<TemplateDocument> => {
        return TemplateModel.findByIdAndDelete(templateId).orFail(new DocumentNotFoundError(templateId)).lean().exec();
    };
}
