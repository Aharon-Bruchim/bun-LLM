import { readFileSync, writeFileSync } from "fs";
import { calculatorTool, executeCalculator } from "./tools/calculator.js";
import { datetimeTool, executeDatetime } from "./tools/datetime.js";
import { weatherTool, executeWeather } from "./tools/weather.js";
import { randomTool, executeRandom } from "./tools/random.js";
import { filesystemTool, executeFilesystem } from "./tools/filesystem.js";
import { webTool, executeWeb } from "./tools/web.js";

const config = JSON.parse(readFileSync("./config.json", "utf-8"));

// המרת Tool לפורמט OpenAI
function formatToolForAPI(tool) {
  return {
    type: "function",
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters
    }
  };
}

// רשימת כל הכלים (web_search מושבת ב-Groq)
const tools = [
  formatToolForAPI(calculatorTool),
  formatToolForAPI(datetimeTool),
  formatToolForAPI(weatherTool),
  formatToolForAPI(randomTool),
  formatToolForAPI(filesystemTool)
  // formatToolForAPI(webTool) // לא עובד עם Groq/Llama
];

// מיפוי שם כלי לפונקציה שמבצעת אותו
const toolExecutors = {
  calculator: executeCalculator,
  datetime: executeDatetime,
  weather: executeWeather,
  random: executeRandom,
  filesystem: executeFilesystem,
  web_search: executeWeb
};

// שליחת בקשה ל-LLM עם כלים (תומך בכמה סיבובים)
async function askWithTools(prompt) {
  const { apiKey, model, providers, provider } = config;
  const baseUrl = providers[provider].baseUrl;

  const messages = [
    {
      role: "system",
      content: `You are a helpful assistant with access to tools.
When you need to use a tool, call it by its name with the required parameters.
Available tools: calculator, datetime, weather, random, filesystem, web_search.
Always respond in the same language as the user's question.`
    },
    { role: "user", content: prompt }
  ];
  const allToolCalls = [];
  const allToolResults = [];

  const MAX_ITERATIONS = 10; // הגנה מפני לולאה אינסופית
  let iteration = 0;

  while (iteration < MAX_ITERATIONS) {
    iteration++;
    console.log(`\n--- סיבוב ${iteration} ---`);

    const response = await fetch(baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages,
        tools,
        tool_choice: "auto"
      })
    });

    const data = await response.json();

    if (data.error) {
      console.error("API Error:", data.error.message || data.error);
      return null;
    }

    const assistantMessage = data.choices[0].message;

    // אם ה-LLM לא רוצה להשתמש בכלי - סיימנו!
    if (!assistantMessage.tool_calls) {
      console.log("LLM סיים - אין עוד tool calls");
      return {
        type: allToolCalls.length > 0 ? "with_tools" : "direct",
        toolCalls: allToolCalls,
        toolResults: allToolResults,
        answer: assistantMessage.content,
        iterations: iteration
      };
    }

    // הפעלת הכלים
    console.log(`LLM מבקש להפעיל ${assistantMessage.tool_calls.length} כלים...`);

    const toolResults = [];

    for (const toolCall of assistantMessage.tool_calls) {
      let toolName = toolCall.function.name;
      let toolArgs;

      // תיקון לבעיה של Groq/Llama שמשלב שם כלי עם פרמטרים
      if (toolName.includes(',{') || toolName.includes('={')) {
        const match = toolName.match(/^([a-z_]+)[,=](.+)$/);
        if (match) {
          toolName = match[1];
          toolArgs = JSON.parse(match[2]);
        } else {
          toolArgs = JSON.parse(toolCall.function.arguments || '{}');
        }
      } else {
        toolArgs = JSON.parse(toolCall.function.arguments || '{}');
      }

      console.log(`  מפעיל: ${toolName}`, toolArgs);

      const executor = toolExecutors[toolName];
      if (!executor) {
        console.error(`  כלי לא נמצא: ${toolName}`);
        continue;
      }

      const result = await executor(toolArgs);
      console.log(`  תוצאה:`, result.success ? "הצלחה" : "שגיאה");

      // שמירה לרשימה הכללית
      allToolCalls.push({ name: toolName, args: toolArgs });
      allToolResults.push(result);

      toolResults.push({
        role: "tool",
        tool_call_id: toolCall.id,
        content: JSON.stringify(result)
      });
    }

    // הוספה להיסטוריה והמשך לסיבוב הבא
    messages.push(assistantMessage);
    messages.push(...toolResults);
  }

  console.log("הגענו למקסימום סיבובים!");
  return {
    type: "max_iterations",
    toolCalls: allToolCalls,
    toolResults: allToolResults,
    answer: "הגעתי למקסימום פעולות",
    iterations: iteration
  };
}

async function main() {
  if (config.apiKey === "YOUR_API_KEY_HERE") {
    console.error("ERROR: Set your API key in config.json");
    return;
  }

  console.log(`Using: ${config.provider} / ${config.model}`);
  console.log(`Tools: ${tools.map(t => t.function.name).join(", ")}\n`);

  // שאלה מהקונפיג
  const question = config.question || "כמה זה 145 כפול 23?";

  console.log(`שאלה: ${question}\n`);

  // זיהוי אוטומטי של חיפוש - עוקף את Llama
  const searchKeywords = ["search", "חפש", "חיפוש", "find online", "look up", "google"];
  const needsSearch = searchKeywords.some(kw => question.toLowerCase().includes(kw));

  let result;
  if (needsSearch) {
    console.log("🔍 זוהה חיפוש - מפעיל web_search ישירות...\n");
    const searchResult = await executeWeb({ query: question });

    if (searchResult.success) {
      // שולחים את תוצאות החיפוש ל-LLM לסיכום (בלי tools!)
      const searchContext = searchResult.results.map(r => `- ${r.title}: ${r.snippet}`).join('\n');

      const response = await fetch(config.providers[config.provider].baseUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${config.apiKey}`
        },
        body: JSON.stringify({
          model: config.model,
          messages: [
            { role: "system", content: "Answer based on the search results provided. Respond in Hebrew." },
            { role: "user", content: `Question: ${question}\n\nSearch results:\n${searchContext}` }
          ]
        })
      });

      const data = await response.json();
      result = {
        type: "web_search",
        searchResults: searchResult.results,
        answer: data.choices?.[0]?.message?.content || "לא הצלחתי לסכם את התוצאות"
      };
    } else {
      result = { type: "error", answer: "שגיאה בחיפוש: " + searchResult.error };
    }
  } else {
    result = await askWithTools(question);
  }

  if (result) {
    console.log("=== תשובה סופית ===");
    console.log(result.answer);

    // שמירה לקובץ
    writeFileSync("./tool_response.json", JSON.stringify(result, null, 2));
    console.log("\nנשמר ל-tool_response.json");
  }
}

main();
