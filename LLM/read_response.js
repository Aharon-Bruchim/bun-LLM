import { readFileSync } from "fs";

const response = JSON.parse(readFileSync("./response.json", "utf-8"));

console.log("=== גרסה גולמית (raw) ===");
console.log(response.answer);

console.log("\n=== גרסה מפורקת לשורות ===");
const lines = response.answer.split("\n");
lines.forEach((line, i) => {
    console.log(`שורה ${i + 1}: ${line}`);
});
