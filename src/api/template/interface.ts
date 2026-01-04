export interface Template {
    name: string;
    email: string;
}

export interface TemplateDocument extends Template {
    _id: string;
}
