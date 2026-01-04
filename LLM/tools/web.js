import { readFileSync } from "fs";
import { config } from "dotenv";

config();

function getSerperApiKey() {
  if (process.env.SERPER_API_KEY) {
    return process.env.SERPER_API_KEY;
  }
  
  try {
    const configData = JSON.parse(readFileSync("./config.json", "utf-8"));
    const raw = configData.serperApiKey;
    if (raw?.startsWith("${") && raw?.endsWith("}")) {
      const envKey = raw.slice(2, -1);
      return process.env[envKey];
    }
    return raw;
  } catch {
    return null;
  }
}

export const webTool = {
  name: "web_search",
  description: "Search the internet using Google (via Serper API)",
  parameters: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "The search query"
      }
    },
    required: ["query"]
  }
};

export async function executeWeb({ query }) {
  try {
    if (!query) {
      return { success: false, error: "Missing search query" };
    }

    const apiKey = getSerperApiKey();
    if (!apiKey) {
      return { success: false, error: "Missing Serper API key" };
    }

    const response = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: {
        "X-API-KEY": apiKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        q: query,
        gl: "il",
        hl: "he"
      })
    });

    if (!response.ok) {
      return {
        success: false,
        error: `Serper API error: ${response.status}`
      };
    }

    const data = await response.json();

    const results = [];

    if (data.knowledgeGraph) {
      results.push({
        title: data.knowledgeGraph.title || "Knowledge Graph",
        url: data.knowledgeGraph.website || "",
        snippet: data.knowledgeGraph.description || "",
        type: "knowledge_graph"
      });
    }

    if (data.organic) {
      for (const item of data.organic.slice(0, 5)) {
        results.push({
          title: item.title,
          url: item.link,
          snippet: item.snippet || "",
          type: "organic"
        });
      }
    }

    if (data.peopleAlsoAsk) {
      for (const item of data.peopleAlsoAsk.slice(0, 2)) {
        results.push({
          title: item.question,
          url: item.link || "",
          snippet: item.snippet || "",
          type: "related_question"
        });
      }
    }

    return {
      success: true,
      query,
      resultsCount: results.length,
      results,
      source: "google_serper"
    };

  } catch (error) {
    return { success: false, error: error.message };
  }
}