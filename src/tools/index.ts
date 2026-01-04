import { toolRegistry } from './registry';
import { dbTool } from './db/db.tool';
// import { webTool } from './web.tool';
// import { filesystemTool } from './filesystem.tool';
import { logger } from '../utils/logger';

export function initializeTools(): void {
    logger.info('Initializing LLM tools...');

    toolRegistry.registerAll([dbTool]);

    logger.info(`Registered ${toolRegistry.listTools().length} tools: ${toolRegistry.listTools().join(', ')}`);
}

export { toolRegistry };
