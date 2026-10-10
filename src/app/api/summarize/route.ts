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
                content: "你是一个专业的RSS文章精简与摘要助手。请用中文提供简洁、高质量的要点式摘要（包含核心结论、关键技术或亮点），控制在 200 字以内。",
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
      summaryText = `[AI 模拟摘要 - 未检测到 AI_API_KEY] 这是一篇关于《${entry.title}》的文章。内容涵盖了相关领域的核心动态与实践细节，建议阅读原文获取完整深度信息。`;
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
