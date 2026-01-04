// בדיקה ישירה של web search - בלי LLM
import { executeWeb } from "./tools/web.js";

async function test() {
  console.log("בודק חיפוש באינטרנט...\n");

  const result = await executeWeb({
    query: "Chef Games Israel season 2 winner"
  });

  console.log("תוצאה:", JSON.stringify(result, null, 2));
}

test();
