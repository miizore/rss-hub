import Parser from "rss-parser";

const parser = new Parser({
  customFields: {
    item: [["content:encoded", "contentEncoded"], ["dc:creator", "creator"]],
  },
});

export interface ParsedFeedItem {
  title: string;
  link: string;
  content?: string;
  contentSnippet?: string;
  pubDate?: string;
  guid?: string;
  author?: string;
}

export interface ParsedFeed {
  title: string;
  description?: string;
  link?: string;
  items: ParsedFeedItem[];
}

export async function fetchAndParseFeed(url: string): Promise<ParsedFeed> {
  try {
    const feed = await parser.parseURL(url);
    return {
      title: feed.title || "Untitled Feed",
      description: feed.description,
      link: feed.link,
      items: (feed.items || []).map((item) => ({
        title: item.title || "Untitled",
        link: item.link || "",
        content: (item as any).contentEncoded || item.content || item.contentSnippet || "",
        contentSnippet: item.contentSnippet,
        pubDate: item.pubDate,
        guid: item.guid || item.link,
        author: (item as any).creator || (item as any).author,
      })),
    };
  } catch (error) {
    console.error(`Failed to fetch and parse feed from ${url}:`, error);
    throw new Error(`Failed to parse RSS feed: ${error instanceof Error ? error.message : String(error)}`);
  }
}
