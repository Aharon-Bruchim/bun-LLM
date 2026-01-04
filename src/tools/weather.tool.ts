import { z } from 'zod';
import type { Tool, ToolResult, ToolContext } from './types/tool.interface';

const weatherInputSchema = z.object({
    city: z.string().min(1),
});

type WeatherInput = z.infer<typeof weatherInputSchema>;

interface WeatherOutput {
    city: string;
    temperature: number;
    temperatureUnit: string;
    condition: string;
    humidity: number;
    humidityUnit: string;
}

interface WeatherError {
    availableCities: string[];
}

// Mock data - in production connect to weather API
const weatherData: Record<string, { temp: number; condition: string; humidity: number }> = {
    'תל אביב': { temp: 22, condition: 'בהיר', humidity: 65 },
    'tel aviv': { temp: 22, condition: 'בהיר', humidity: 65 },
    ירושלים: { temp: 18, condition: 'מעונן חלקית', humidity: 55 },
    jerusalem: { temp: 18, condition: 'מעונן חלקית', humidity: 55 },
    חיפה: { temp: 21, condition: 'בהיר', humidity: 70 },
    haifa: { temp: 21, condition: 'בהיר', humidity: 70 },
    אילת: { temp: 28, condition: 'שמשי וחם', humidity: 30 },
    eilat: { temp: 28, condition: 'שמשי וחם', humidity: 30 },
    'באר שבע': { temp: 24, condition: 'בהיר', humidity: 40 },
    'beer sheva': { temp: 24, condition: 'בהיר', humidity: 40 },
};

export const weatherTool: Tool<WeatherInput, WeatherOutput | WeatherError> = {
    name: 'weather',
    description: 'Get weather information for a city',
    parameters: {
        type: 'object',
        properties: {
            city: {
                type: 'string',
                description: 'City name (e.g., Tel Aviv, Jerusalem, Haifa)',
            },
        },
        required: ['city'],
    },
    inputSchema: weatherInputSchema,
    requiresAuth: false,

    async execute(
        input: WeatherInput,
        _context: ToolContext
    ): Promise<ToolResult<WeatherOutput | WeatherError>> {
        const { city } = input;
        const cityLower = city.toLowerCase();
        const data = weatherData[city] || weatherData[cityLower];

        if (!data) {
            return {
                success: false,
                error: `No data found for city "${city}"`,
                data: {
                    availableCities: ['תל אביב', 'ירושלים', 'חיפה', 'אילת', 'באר שבע'],
                },
            };
        }

        return {
            success: true,
            data: {
                city,
                temperature: data.temp,
                temperatureUnit: 'C',
                condition: data.condition,
                humidity: data.humidity,
                humidityUnit: '%',
            },
        };
    },
};
