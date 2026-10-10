import { NextResponse } from "next/server";
import { db } from "@/db";
import { feeds, entries } from "@/db/schema";
import { fetchAndParseFeed } from "@/lib/rss";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    const allFeeds = await db.select().from(feeds).orderBy(feeds.createdAt);
    return NextResponse.json({ success: true, data: allFeeds });
  } catch (error) {
    console.error("Error fetching feeds:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { url } = body;

    if (!url || typeof url !== "string") {
      return NextResponse.json({ success: false, error: "Valid RSS URL is required" }, { status: 400 });
    }

    // Check if feed already exists
    const existing = await db.select().from(feeds).where(eq(feeds.url, url)).limit(1);
    if (existing.length > 0) {
      return NextResponse.json({ success: false, error: "Feed already exists" }, { status: 409 });
    }

    // Parse feed
    const parsed = await fetchAndParseFeed(url);

    // Insert feed
    const [newFeed] = await db
      .insert(feeds)
      .values({
        name: parsed.title,
        url: url,
        description: parsed.description || null,
        icon: parsed.link ? new URL(parsed.link).origin + "/favicon.ico" : null,
      })
      .returning();

    // Insert initial entries (up to 50 latest)
    const itemsToInsert = parsed.items.slice(0, 50);
    for (const item of itemsToInsert) {
      try {
        await db.insert(entries).values({
          feedId: newFeed.id,
          title: item.title,
          link: item.link,
          content: item.content || item.contentSnippet || null,
          author: item.author || null,
          publishedAt: item.pubDate ? new Date(item.pubDate) : new Date(),
          guid: item.guid || item.link,
        }).onConflictDoNothing();
      } catch (err) {
        console.error("Failed to insert entry:", err);
      }
    }

    return NextResponse.json({ success: true, data: newFeed }, { status: 201 });
  } catch (error) {
    console.error("Error adding feed:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
