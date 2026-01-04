import { readFileSync, writeFileSync } from "fs";

const config = JSON.parse(readFileSync("./config.json", "utf-8"));

async function askLLM(prompt) {
    const { provider, apiKey, model, providers } = config;
    const providerConfig = providers[provider];
    
    if (provider === "gemini") {
        return askGemini(prompt, apiKey, model, providerConfig.baseUrl);
    }
    
    return askOpenAIFormat(prompt, apiKey, model, providerConfig.baseUrl);
}

async function askOpenAIFormat(prompt, apiKey, model, baseUrl) {
    const response = await fetch(baseUrl, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model,
            messages: [{ role: "user", content: prompt }]
        })
    });
    
    const data = await response.json();
    
    if (data.error) {
        console.error("API Error:", data.error.message || data.error);
        return null;
    }
    
    return data.choices[0].message.content;
}

async function askGemini(prompt, apiKey, model, baseUrlTemplate) {
    const url = baseUrlTemplate.replace("{model}", model) + `?key=${apiKey}`;
    
    const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }]
        })
    });
    
    const data = await response.json();
    
    if (data.error) {
        console.error("API Error:", data.error.message);
        return null;
    }
    
    return data.candidates[0].content.parts[0].text;
}

async function main() {
    if (config.apiKey === "YOUR_API_KEY_HERE") {
        console.error("ERROR: Set your API key in config.json");
        return;
    }

    console.log(`Using: ${config.provider} / ${config.model}\n`);

    const question = config.question || "What is Bitcoin in one sentence?";
    const answer = await askLLM(question);

    if (answer) {
        if (config.responseFormat === "json") {
            const output = { question, answer };
            writeFileSync("./response.json", JSON.stringify(output, null, 2));
            console.log("Response saved to response.json");
        } else {
            console.log(`Q: ${question}`);
            console.log(`A: ${answer}`);
        }
    }
}

main();