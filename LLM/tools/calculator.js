// Calculator Tool - כלי מחשבון עבור LLM

// הגדרת הכלי (Schema) - זה מה שה-LLM רואה
export const calculatorTool = {
  name: "calculator",
  description: "Perform math calculations - add, subtract, multiply, divide",
  parameters: {
    type: "object",
    properties: {
      operation: {
        type: "string",
        enum: ["add", "subtract", "multiply", "divide"],
        description: "The math operation type"
      },
      num1: {
        type: "number",
        description: "First number"
      },
      num2: {
        type: "number",
        description: "Second number"
      }
    },
    required: ["operation", "num1", "num2"]
  }
};

// הפונקציה שמבצעת את החישוב
export function executeCalculator({ operation, num1, num2 }) {
  let result;
  let operationSymbol;

  switch (operation) {
    case "add":
      result = num1 + num2;
      operationSymbol = "+";
      break;
    case "subtract":
      result = num1 - num2;
      operationSymbol = "-";
      break;
    case "multiply":
      result = num1 * num2;
      operationSymbol = "×";
      break;
    case "divide":
      if (num2 === 0) {
        return { error: "לא ניתן לחלק באפס" };
      }
      result = num1 / num2;
      operationSymbol = "÷";
      break;
    default:
      return { error: "פעולה לא מוכרת" };
  }

  return {
    success: true,
    operation: operation,
    expression: `${num1} ${operationSymbol} ${num2}`,
    result: result
  };
}
