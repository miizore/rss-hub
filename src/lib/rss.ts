import Parser from "rss-parser";
import { decodeHtmlEntities } from "./utils";

const parser = new Parser({
  customFields: {
    item: [
      ["content:encoded", "contentEncoded"],
      ["dc:creator", "creator"],
      ["enclosure", "enclosure"],
      ["media:content", "mediaContent"],
      ["media:thumbnail", "mediaThumbnail"],
    ],
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
  thumbnail?: string;
}

export interface ParsedFeed {
  title: string;
  description?: string;
  link?: string;
  items: ParsedFeedItem[];
}

function extractThumbnail(item: any): string | undefined {
  if (item.enclosure && item.enclosure.url && item.enclosure.type?.startsWith("image")) {
    return item.enclosure.url;
  }
  if (item.mediaContent?.$.url) {
    return item.mediaContent.$.url;
  }
  if (item.mediaThumbnail?.$.url) {
    return item.mediaThumbnail.$.url;
  }
  const contentHtml = item.contentEncoded || item.content || item.contentSnippet || "";
  const imgMatch = contentHtml.match(/<img[^>]+src="([^">]+)"/);
  if (imgMatch && imgMatch[1]) {
    return imgMatch[1];
  }
  return undefined;
}

export async function fetchAndParseFeed(url: string): Promise<ParsedFeed> {
  try {
    const feed = await parser.parseURL(url);
    return {
      title: decodeHtmlEntities(feed.title || "Untitled Feed"),
      description: feed.description ? decodeHtmlEntities(feed.description) : undefined,
      link: feed.link,
      items: (feed.items || []).map((item) => {
        const content = (item as any).contentEncoded || item.content || item.contentSnippet || "";
        return {
          title: decodeHtmlEntities(item.title || "Untitled"),
          link: item.link || "",
          content: content,
          contentSnippet: item.contentSnippet ? decodeHtmlEntities(item.contentSnippet) : undefined,
          pubDate: item.pubDate,
          guid: item.guid || item.link,
          author: (item as any).creator || (item as any).author,
          thumbnail: extractThumbnail(item),
        };
      }),
    };
  } catch (error) {
    console.error(`Failed to fetch and parse feed from ${url}:`, error);
    throw new Error(`Failed to parse RSS feed: ${error instanceof Error ? error.message : String(error)}`);
  }
}
