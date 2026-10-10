import { NextResponse } from "next/server";
import { db } from "@/db";
import { entries, summaries } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const feedId = searchParams.get("feedId");

    let query = db
      .select({
        id: entries.id,
        feedId: entries.feedId,
        title: entries.title,
        link: entries.link,
        content: entries.content,
        author: entries.author,
        publishedAt: entries.publishedAt,
        createdAt: entries.createdAt,
        summary: summaries.content,
        modelUsed: summaries.modelUsed,
      })
      .from(entries)
      .leftJoin(summaries, eq(entries.id, summaries.entryId))
      .orderBy(desc(entries.publishedAt));

    if (feedId) {
      const data = await query.where(eq(entries.feedId, feedId)).limit(100);
      return NextResponse.json({ success: true, data });
    }

    const data = await query.limit(100);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Error fetching entries:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
