// Random Tool - כלי מספרים אקראיים

export const randomTool = {
  name: "random",
  description: "Generate random number, pick random item from list, roll dice or flip coin",
  parameters: {
    type: "object",
    properties: {
      type: {
        type: "string",
        enum: ["number", "choice", "dice", "coin"],
        description: "Type: number, choice, dice, or coin"
      },
      min: {
        type: "number",
        description: "Minimum number (for type=number)"
      },
      max: {
        type: "number",
        description: "Maximum number (for type=number)"
      },
      options: {
        type: "array",
        items: { type: "string" },
        description: "List of options (for type=choice)"
      }
    },
    required: ["type"]
  }
};

export function executeRandom({ type, min = 1, max = 100, options = [] }) {
  switch (type) {
    case "number":
      const randomNum = Math.floor(Math.random() * (max - min + 1)) + min;
      return {
        success: true,
        type: "number",
        min,
        max,
        result: randomNum
      };

    case "choice":
      if (options.length === 0) {
        return { success: false, error: "חסרה רשימת אפשרויות" };
      }
      const randomIndex = Math.floor(Math.random() * options.length);
      return {
        success: true,
        type: "choice",
        options,
        result: options[randomIndex]
      };

    case "dice":
      const diceResult = Math.floor(Math.random() * 6) + 1;
      return {
        success: true,
        type: "dice",
        result: diceResult,
        display: `🎲 ${diceResult}`
      };

    case "coin":
      const coinResult = Math.random() < 0.5 ? "עץ" : "פלי";
      return {
        success: true,
        type: "coin",
        result: coinResult,
        display: coinResult === "עץ" ? "🌳 עץ" : "👑 פלי"
      };

    default:
      return { success: false, error: "סוג לא מוכר" };
  }
}
