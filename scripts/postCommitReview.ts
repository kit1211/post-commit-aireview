import { execSync } from "child_process";
import { OpenAI } from "openai";
import chalk from "chalk";
import fs from "fs";

// ตั้งค่า OpenAI API
const openai = new OpenAI({
    apiKey: process.env.OPENROUTER_API_KEY,
    baseURL: "https://openrouter.ai/api/v1", // https://api.openai.com/v1
});

(async () => {
    try {
        const startTime = Date.now();

        // ดึง diff ของ commit ล่าสุด
        const diff = execSync("git diff --unified=0 HEAD~1 HEAD").toString().trim();


        if (!diff) {
            console.log("✅ ไม่มีการเปลี่ยนแปลงสำหรับรีวิว");
            process.exit(0);
        }

        console.log(chalk.green("🔍 AI Reviewing Commit..."));

        // ดึงเฉพาะโค้ดที่เพิ่มหรือเปลี่ยนแปลง
        const changedLines = diff
            .split("\n")
            .filter(line => line.startsWith("+") && !line.startsWith("+++")) // ตัด header diff
            .map(line => line.substring(1)) // ตัด `+` ออก
            .join("\n")
            .trim();

        if (!changedLines) {
            console.log("✅ ไม่มีโค้ดใหม่ที่ต้องรีวิว");
            process.exit(0);
        }


        // ส่งโค้ดไปให้ AI วิเคราะห์
        const response = await openai.chat.completions.create({
            model: "anthropic/claude-3.5-sonnet", // deepseek/deepseek-r1-distill-llama-70b
            messages: [
                { role: "system", content: "คุณคือโค้ดรีวิว AI ที่ช่วยวิเคราะห์คุณภาพโค้ด กระชับ ตรงประเด็นและจะตอบเป็นภาษาไทย" },
                { role: "user", content: `โปรดตรวจสอบและแนะนำการปรับปรุงโค้ดนี้:\n\n${changedLines}` },
            ],
            temperature: 0.1,
        });

        // ดึงผลลัพธ์จาก AI
        const review           = response.choices[0].message?.content || "AI ไม่สามารถวิเคราะห์โค้ดนี้ได้";
        const modelUsed        = response.model;
        const totalTokens      = response.usage?.total_tokens || 0;
        const promptTokens     = response.usage?.prompt_tokens || 0;
        const completionTokens = response.usage?.completion_tokens || 0;

        // แปลง Token เป็น USD ตามอัตราค่าบริการของ OpenAI
        const costPer1kTokens = 0.01;
        const costInUSD = (totalTokens / 1000) * costPer1kTokens;

        console.log(chalk.green("\n🚀 AI Review Suggestions:\n"));
        console.log(review);

        // คำนวณเวลาที่ใช้
        const elapsedTime = (Date.now() - startTime) / 1000;
        let elapsedTimeFormatted = `${elapsedTime.toFixed(2)} วินาที`;
        if (elapsedTime > 60) {
            elapsedTimeFormatted = `${(elapsedTime / 60).toFixed(2)} นาที`;
        }

        console.log("\n");
        console.log(chalk.whiteBright(`⏳ เวลาที่ใช้ในการรีวิว: ${elapsedTimeFormatted}`));
        console.log(chalk.whiteBright(`📌 Model ที่ใช้: ${modelUsed}`));
        console.log(chalk.whiteBright(`🔢 จำนวน Token ที่ใช้: ${totalTokens} tokens`));
        console.log(chalk.whiteBright(`💲 ค่าใช้จ่ายของ ขาเข้า Prompt: $${(promptTokens / 1000 * costPer1kTokens).toFixed(6)} USD`));
        console.log(chalk.whiteBright(`💲 ค่าใช้จ่ายของ ขาออก Completion: $${(completionTokens / 1000 * costPer1kTokens).toFixed(6)} USD`));
        console.log(chalk.whiteBright(`💲 ค่าใช้จ่ายทั้งหมด: $${costInUSD.toFixed(6)} USD`));

        // บันทึกลงไฟล์
        const filePath = `./review/commit-review-${new Date().getTime()}.log`;
        fs.writeFileSync(filePath, review, { encoding: "utf-8" });
        console.log(chalk.green(`✅ บันทึก AI Review ลงไฟล์ ${filePath} แล้ว`));

        process.exit(0);
    } catch (err) {
        console.error("❌ Error:", err);
        process.exit(1);
    }
})();
