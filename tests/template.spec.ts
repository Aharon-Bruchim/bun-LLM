import { Express } from 'express';
import mongoose from 'mongoose';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { config } from '../src/config';
import { Template } from '../src/express/template/interface';
import { Server } from '../src/express/server';

const { mongo } = config;

const fakeObjectId = '111111111111111111111111';

const removeAllCollections = async () => {
    const collections = Object.keys(mongoose.connection.collections);

    for (const collectionName of collections) {
        const collection = mongoose.connection.collections[collectionName];
        await collection!.deleteMany({});
    }
};

const exampleTemplate: Template = {
    name: 'test',
    email: 'test@example.com',
};

describe('e2e template api testing', () => {
    let app: Express;

    beforeAll(async () => {
        await mongoose.connect(mongo.uri);
        app = Server.createExpressApp();
    });

    afterAll(async () => {
        await mongoose.disconnect();
    });

    beforeEach(async () => {
        await removeAllCollections();
    });

    describe('/isAlive', () => {
        it('should return alive', async () => {
            const response = await request(app).get('/isAlive').expect(200);
            expect(response.text).toBe('alive');
        });
    });

    describe('/unknownRoute', () => {
        it('should return status code 404', async () => {
            return request(app).get('/unknownRoute').expect(404);
        });
    });

    describe('/api/template', () => {
        describe('GET /api/template', () => {
            it('should get all the templates', async () => {
                const templates: Template[] = [];

                for (let i = 0; i < 3; i++) {
                    const { body: template } = await request(app).post('/api/template').send(exampleTemplate).expect(200);

                    templates.push(template);
                }

                const { body } = await request(app).get('/api/template').expect(200);

                expect(body).toEqual(templates);
            });

            it('should get templates with pagination', async () => {
                const templates: Template[] = [];

                for (let i = 0; i < 15; i++) {
                    const { body: template } = await request(app).post('/api/template').send(exampleTemplate).expect(200);

                    templates.push(template);
                }

                const [{ body: body1 }, { body: body2 }, { body: body3 }] = await Promise.all([
                    request(app).get('/api/template').query({ limit: 5, step: 0 }).expect(200),
                    request(app).get('/api/template').query({ limit: 5, step: 1 }).expect(200),
                    request(app).get('/api/template').query({ limit: 5, step: 2 }).expect(200),
                ]);

                expect(body1).toEqual(templates.slice(0, 5));
                expect(body2).toEqual(templates.slice(5, 10));
                expect(body3).toEqual(templates.slice(10, 15));
            });

            it('should get an empty array', async () => {
                const { body } = await request(app).get('/api/template').query({ limit: 100 }).expect(200);

                expect(body).toEqual([]);
            });
        });

        describe('GET /api/template/:id', () => {
            it('should get a template', async () => {
                const { body: template } = await request(app).post('/api/template').send(exampleTemplate).expect(200);

                const { body } = await request(app).get(`/api/template/${template._id}`).expect(200);

                expect(body).toEqual(template);
            });

            it('should fail for getting a non-existing template', async () => {
                return request(app).get(`/api/template/${fakeObjectId}`).expect(404);
            });
        });

        describe('GET /api/template/count', () => {
            it('should get templates count', async () => {
                const count = 4;

                await Promise.all(Array.from({ length: count }, () => request(app).post('/api/template').send(exampleTemplate).expect(200)));

                const { body } = await request(app).get('/api/template/count').expect(200);

                expect(body).toEqual(count);
            });

            it('should get zero when there are no templates', async () => {
                const { body } = await request(app).get('/api/template/count').expect(200);

                expect(body).toEqual(0);
            });
        });

        describe('POST /api/template', () => {
            it('should create a new template', async () => {
                const { body } = await request(app).post('/api/template').send(exampleTemplate).expect(200);

                expect(body).toEqual(expect.objectContaining(exampleTemplate));
            });

            it('should fail validation for missing fields', async () => {
                return request(app).post('/api/template').send({}).expect(400);
            });
        });

        describe('PUT /api/template/:id', () => {
            it('should update template', async () => {
                const propertyForUpdate = 'test2';

                const {
                    body: { _id },
                } = await request(app).post('/api/template').send(exampleTemplate).expect(200);

                const {
                    body: { name },
                } = await request(app).put(`/api/template/${_id}`).send({ name: propertyForUpdate }).expect(200);

                expect(name).toEqual(propertyForUpdate);
            });

            it('should fail for updating a non-existing template', async () => {
                return request(app).put(`/api/template/${fakeObjectId}`).send(exampleTemplate).expect(404);
            });
        });

        describe('DELETE /api/template/:id', () => {
            it('should delete template', async () => {
                const {
                    body: { _id },
                } = await request(app).post('/api/template').send(exampleTemplate).expect(200);

                return request(app).delete(`/api/template/${_id}`).expect(200);
            });

            it('should fail for deleting a non-existing template', async () => {
                return request(app).delete(`/api/template/${fakeObjectId}`).expect(404);
            });
        });
    });
});
