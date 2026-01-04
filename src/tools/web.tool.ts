import { z } from 'zod';
import type { Tool, ToolResult, ToolContext } from './types/tool.interface';
import { config } from '../config';

const webInputSchema = z.object({
    query: z.string().min(1),
});

type WebInput = z.infer<typeof webInputSchema>;

interface SearchResult {
    title: string;
    url: string;
    snippet: string;
    type: 'knowledge_graph' | 'organic' | 'related_question';
}

interface WebOutput {
    query: string;
    resultsCount: number;
    results: SearchResult[];
    source: string;
}

interface SerperKnowledgeGraph {
    title?: string;
    website?: string;
    description?: string;
}

interface SerperOrganicResult {
    title: string;
    link: string;
    snippet?: string;
}

interface SerperPeopleAlsoAsk {
    question: string;
    link?: string;
    snippet?: string;
}

interface SerperResponse {
    knowledgeGraph?: SerperKnowledgeGraph;
    organic?: SerperOrganicResult[];
    peopleAlsoAsk?: SerperPeopleAlsoAsk[];
}

export const webTool: Tool<WebInput, WebOutput> = {
    name: 'web_search',
    description: 'Search the internet using Google (via Serper API)',
    parameters: {
        type: 'object',
        properties: {
            query: {
                type: 'string',
                description: 'The search query',
            },
        },
        required: ['query'],
    },
    inputSchema: webInputSchema,
    requiresAuth: false,

    async execute(input: WebInput, _context: ToolContext): Promise<ToolResult<WebOutput>> {
        const { query } = input;

        try {
            const apiKey = config.serper?.apiKey;
            if (!apiKey) {
                return { success: false, error: 'Missing Serper API key' };
            }

            const response = await fetch('https://google.serper.dev/search', {
                method: 'POST',
                headers: {
                    'X-API-KEY': apiKey,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    q: query,
                    gl: 'il',
                    hl: 'he',
                }),
            });

            if (!response.ok) {
                return {
                    success: false,
                    error: `Serper API error: ${response.status}`,
                };
            }

            const data = (await response.json()) as SerperResponse;
            const results: SearchResult[] = [];

            if (data.knowledgeGraph) {
                results.push({
                    title: data.knowledgeGraph.title || 'Knowledge Graph',
                    url: data.knowledgeGraph.website || '',
                    snippet: data.knowledgeGraph.description || '',
                    type: 'knowledge_graph',
                });
            }

            if (data.organic) {
                for (const item of data.organic.slice(0, 5)) {
                    results.push({
                        title: item.title,
                        url: item.link,
                        snippet: item.snippet || '',
                        type: 'organic',
                    });
                }
            }

            if (data.peopleAlsoAsk) {
                for (const item of data.peopleAlsoAsk.slice(0, 2)) {
                    results.push({
                        title: item.question,
                        url: item.link || '',
                        snippet: item.snippet || '',
                        type: 'related_question',
                    });
                }
            }

            return {
                success: true,
                data: {
                    query,
                    resultsCount: results.length,
                    results,
                    source: 'google_serper',
                },
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    },
};
