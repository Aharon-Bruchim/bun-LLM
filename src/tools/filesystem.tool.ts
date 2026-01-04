import { z } from 'zod';
import { readFile, writeFile, readdir, unlink, mkdir, stat, access } from 'fs/promises';
import { join, dirname, resolve } from 'path';
import type { Tool, ToolResult, ToolContext } from './types/tool.interface';

const filesystemInputSchema = z.object({
    action: z.enum(['read', 'write', 'list', 'delete', 'mkdir', 'exists']),
    path: z.string().min(1),
    content: z.string().optional(),
});

type FilesystemInput = z.infer<typeof filesystemInputSchema>;

interface FileItem {
    name: string;
    type: 'folder' | 'file';
    size: number | null;
}

interface FilesystemOutput {
    action: string;
    path: string;
    content?: string;
    lineCount?: number;
    bytesWritten?: number;
    items?: FileItem[];
    count?: number;
    message?: string;
    exists?: boolean;
    type?: 'folder' | 'file' | null;
}

const BASE_DIR = process.cwd();

function safePath(inputPath: string): string {
    const fullPath = resolve(join(BASE_DIR, inputPath));
    if (!fullPath.startsWith(BASE_DIR)) {
        throw new Error('Access to this path is forbidden');
    }
    return fullPath;
}

export const filesystemTool: Tool<FilesystemInput, FilesystemOutput> = {
    name: 'filesystem',
    description: 'File management - read, write, create folders, delete, list directory contents',
    parameters: {
        type: 'object',
        properties: {
            action: {
                type: 'string',
                enum: ['read', 'write', 'list', 'delete', 'mkdir', 'exists'],
                description: 'Action: read, write, list, delete, mkdir, exists',
            },
            path: {
                type: 'string',
                description: 'File or folder path',
            },
            content: {
                type: 'string',
                description: 'Content to write (only for action=write)',
            },
        },
        required: ['action', 'path'],
    },
    inputSchema: filesystemInputSchema,
    requiresAuth: false,

    async execute(input: FilesystemInput, _context: ToolContext): Promise<ToolResult<FilesystemOutput>> {
        const { action, path, content } = input;

        try {
            const fullPath = safePath(path);

            switch (action) {
                case 'read': {
                    const fileContent = await readFile(fullPath, 'utf-8');
                    const lines = fileContent.split('\n');
                    return {
                        success: true,
                        data: {
                            action: 'read',
                            path,
                            content: fileContent,
                            lineCount: lines.length,
                        },
                    };
                }

                case 'write': {
                    if (!content) {
                        return { success: false, error: 'Content is required for write' };
                    }
                    const dir = dirname(fullPath);
                    await mkdir(dir, { recursive: true });
                    await writeFile(fullPath, content, 'utf-8');
                    return {
                        success: true,
                        data: {
                            action: 'write',
                            path,
                            bytesWritten: content.length,
                        },
                    };
                }

                case 'list': {
                    const items = await readdir(fullPath);
                    const detailed: FileItem[] = await Promise.all(
                        items.map(async (item) => {
                            const itemPath = join(fullPath, item);
                            const itemStat = await stat(itemPath);
                            return {
                                name: item,
                                type: itemStat.isDirectory() ? ('folder' as const) : ('file' as const),
                                size: itemStat.isDirectory() ? null : itemStat.size,
                            };
                        }),
                    );
                    return {
                        success: true,
                        data: {
                            action: 'list',
                            path,
                            items: detailed,
                            count: items.length,
                        },
                    };
                }

                case 'delete': {
                    await unlink(fullPath);
                    return {
                        success: true,
                        data: {
                            action: 'delete',
                            path,
                            message: 'File deleted successfully',
                        },
                    };
                }

                case 'mkdir': {
                    await access(fullPath).then(
                        () => {
                            throw new Error(`Directory already exists: ${path}`);
                        },
                        () => {
                            /* doesn't exist, continue */
                        },
                    );
                    await mkdir(fullPath, { recursive: true });
                    return {
                        success: true,
                        data: {
                            action: 'mkdir',
                            path,
                            message: 'Directory created successfully',
                        },
                    };
                }

                case 'exists': {
                    let exists = false;
                    let type: 'folder' | 'file' | null = null;
                    try {
                        const fileStat = await stat(fullPath);
                        exists = true;
                        type = fileStat.isDirectory() ? 'folder' : 'file';
                    } catch {
                        exists = false;
                    }
                    return {
                        success: true,
                        data: {
                            action: 'exists',
                            path,
                            exists,
                            type,
                        },
                    };
                }

                default:
                    return { success: false, error: 'Unknown action' };
            }
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    },
};
