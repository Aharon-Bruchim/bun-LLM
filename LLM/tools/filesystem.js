// Filesystem Tool - כלי ניהול קבצים

import { readFileSync, writeFileSync, readdirSync, unlinkSync, mkdirSync, existsSync, statSync } from "fs";
import { join, dirname } from "path";

export const filesystemTool = {
  name: "filesystem",
  description: "File management - read, write, create folders, delete, list directory contents",
  parameters: {
    type: "object",
    properties: {
      action: {
        type: "string",
        enum: ["read", "write", "list", "delete", "mkdir", "exists"],
        description: "Action: read, write, list, delete, mkdir, exists"
      },
      path: {
        type: "string",
        description: "File or folder path"
      },
      content: {
        type: "string",
        description: "Content to write (only for action=write)"
      }
    },
    required: ["action", "path"]
  }
};

// תיקייה בסיסית מותרת (אבטחה - מונע גישה לקבצים מחוץ לפרויקט)
const BASE_DIR = process.cwd();

function safePath(inputPath) {
  // מוודא שהנתיב בתוך התיקייה המותרת
  const fullPath = join(BASE_DIR, inputPath);
  if (!fullPath.startsWith(BASE_DIR)) {
    throw new Error("גישה לנתיב זה אסורה");
  }
  return fullPath;
}

export function executeFilesystem({ action, path, content }) {
  try {
    const fullPath = safePath(path);

    switch (action) {
      case "read": {
        if (!existsSync(fullPath)) {
          return { success: false, error: `הקובץ לא נמצא: ${path}` };
        }
        const fileContent = readFileSync(fullPath, "utf-8");
        const lines = fileContent.split("\n");
        return {
          success: true,
          action: "read",
          path,
          content: fileContent,
          lineCount: lines.length
        };
      }

      case "write": {
        if (!content) {
          return { success: false, error: "חסר תוכן לכתיבה" };
        }
        // יוצר תיקיות אם לא קיימות
        const dir = dirname(fullPath);
        if (!existsSync(dir)) {
          mkdirSync(dir, { recursive: true });
        }
        writeFileSync(fullPath, content, "utf-8");
        return {
          success: true,
          action: "write",
          path,
          bytesWritten: content.length
        };
      }

      case "list": {
        if (!existsSync(fullPath)) {
          return { success: false, error: `התיקייה לא נמצאה: ${path}` };
        }
        const items = readdirSync(fullPath);
        const detailed = items.map(item => {
          const itemPath = join(fullPath, item);
          const stat = statSync(itemPath);
          return {
            name: item,
            type: stat.isDirectory() ? "folder" : "file",
            size: stat.isDirectory() ? null : stat.size
          };
        });
        return {
          success: true,
          action: "list",
          path,
          items: detailed,
          count: items.length
        };
      }

      case "delete": {
        if (!existsSync(fullPath)) {
          return { success: false, error: `הקובץ לא נמצא: ${path}` };
        }
        unlinkSync(fullPath);
        return {
          success: true,
          action: "delete",
          path,
          message: "הקובץ נמחק בהצלחה"
        };
      }

      case "mkdir": {
        if (existsSync(fullPath)) {
          return { success: false, error: `התיקייה כבר קיימת: ${path}` };
        }
        mkdirSync(fullPath, { recursive: true });
        return {
          success: true,
          action: "mkdir",
          path,
          message: "התיקייה נוצרה בהצלחה"
        };
      }

      case "exists": {
        const exists = existsSync(fullPath);
        let type = null;
        if (exists) {
          type = statSync(fullPath).isDirectory() ? "folder" : "file";
        }
        return {
          success: true,
          action: "exists",
          path,
          exists,
          type
        };
      }

      default:
        return { success: false, error: "פעולה לא מוכרת" };
    }

  } catch (error) {
    return { success: false, error: error.message };
  }
}
