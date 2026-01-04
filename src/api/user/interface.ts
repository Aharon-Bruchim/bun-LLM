export interface User {
    name: string;
    email: string;
    isAdmin: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface UserDocument extends User {
    _id: string;
}
