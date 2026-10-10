import { NextResponse } from "next/server";
import { db } from "@/db";
import { entries, summaries } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { entryId } = body;

    if (!entryId) {
      return NextResponse.json({ success: false, error: "entryId is required" }, { status: 400 });
    }

    // Check if summary already exists
    const existing = await db.select().from(summaries).where(eq(summaries.entryId, entryId)).limit(1);
    if (existing.length > 0) {
      return NextResponse.json({ success: true, data: existing[0] });
    }

    // Fetch entry
    const entryList = await db.select().from(entries).where(eq(entries.id, entryId)).limit(1);
    if (entryList.length === 0) {
      return NextResponse.json({ success: false, error: "Entry not found" }, { status: 404 });
    }

    const entry = entryList[0];
    const textToSummarize = `Title: ${entry.title}\n\nContent:\n${entry.content || "No content available."}`;

    const apiKey = process.env.AI_API_KEY;
    const baseURL = process.env.AI_BASE_URL || "https://generativelanguage.googleapis.com/v1beta/openai";
    const model = process.env.AI_MODEL || "gemini-1.5-flash";

    let summaryText = "";
    let usedModel = model;

    if (apiKey) {
      try {
        const endpoint = `${baseURL.replace(/\/+$/, "")}/chat/completions`;
        console.log(`Calling AI endpoint: ${endpoint} with model ${model}`);

        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: model,
            messages: [
              {
                role: "system",
                content: `你是一个专业的资深 RSS 文章深度拆解与总结助手。请为用户提供一篇结构清晰、内容丰富、字数在 400 到 600 字左右的深度中文摘要。
请严格使用 Markdown 格式排版，包含以下结构：
1. **核心要点**：一句话总结文章精华。
2. **背景与动因**：文章讨论的背景或痛点。
3. **主要内容与技术细节**：详细梳理文章的关键信息、核心观点或技术突破（使用分点列表 - 格式）。
4. **结论或启发**：总结其对读者的价值或未来影响。
必须在适当的词汇和关键结论上使用 **加粗** 语法。`,
              },
              {
                role: "user",
                content: textToSummarize,
              },
            ],
            temperature: 0.3,
          }),
        });

        if (response.ok) {
          const json = await response.json();
          summaryText = json.choices?.[0]?.message?.content || json.candidates?.[0]?.content?.parts?.[0]?.text || "无法生成摘要";
        } else {
          const errText = await response.text();
          console.error("AI API Error Response:", errText);
          return NextResponse.json(
            { success: false, error: `AI API 调用失败 (${response.status}): ${errText.slice(0, 200)}` },
            { status: 502 }
          );
        }
      } catch (aiErr) {
        console.error("AI Request Failed Exception:", aiErr);
        return NextResponse.json(
          { success: false, error: `AI 请求异常: ${aiErr instanceof Error ? aiErr.message : String(aiErr)}` },
          { status: 502 }
        );
      }
    } else {
      // Fallback if no API key is provided
      summaryText = `[AI 模拟摘要 - 未检测到 AI_API_KEY] 
**核心要点**：这是一篇关于《${entry.title}》的深度好文。
- **主要内容**：文章涵盖了相关领域的最新动态与实践细节。
- **详细拆解**：建议读者通过右上角链接阅读原文，以获取完整的上下文和技术实现。`;
      usedModel = "mock-no-key";
    }

    // Save summary
    const [newSummary] = await db
      .insert(summaries)
      .values({
        entryId: entry.id,
        content: summaryText,
        modelUsed: usedModel,
      })
      .returning();

    return NextResponse.json({ success: true, data: newSummary }, { status: 201 });
  } catch (error) {
    console.error("Error summarizing entry:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
