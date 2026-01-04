import * as readline from "readline";

const GEMINI_API_KEY = "AIzaSyB2krEi_qidqUXowydxwoMdtibh-CzVCvw";

async function chatWithLLM(messages) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;
    
    const contents = messages.map(msg => ({
        role: msg.role,
        parts: [{ text: msg.content }]
    }));
    
    const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents })
    });
    
    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
}

async function main() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    
    const conversation = [];
    
    console.log("Chat with Gemini (type 'exit' to quit)");
    console.log("-".repeat(40));
    
    const askQuestion = () => {
        rl.question("\nYou: ", async (userInput) => {
            userInput = userInput.trim();
            
            if (userInput.toLowerCase() === "exit") {
                console.log("Goodbye!");
                rl.close();
                return;
            }
            
            if (!userInput) {
                askQuestion();
                return;
            }
            
            conversation.push({ role: "user", content: userInput });
            
            const response = await chatWithLLM(conversation);
            
            conversation.push({ role: "model", content: response });
            
            console.log(`\nGemini: ${response}`);
            askQuestion();
        });
    };
    
    askQuestion();
}

main();
