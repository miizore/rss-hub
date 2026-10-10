"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Plus, Rss, Sparkles, ExternalLink, RefreshCw, Layers, BookOpen } from "lucide-react";

interface Feed {
  id: string;
  name: string;
  url: string;
  description?: string;
  icon?: string;
}

interface Entry {
  id: string;
  feedId: string;
  title: string;
  link: string;
  content?: string;
  author?: string;
  publishedAt?: string;
  summary?: string;
  modelUsed?: string;
}

export default function Home() {
  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [selectedFeedId, setSelectedFeedId] = useState<string | null>(null);
  const [newFeedUrl, setNewFeedUrl] = useState("");
  const [loadingFeeds, setLoadingFeeds] = useState(false);
  const [loadingEntries, setLoadingEntries] = useState(false);
  const [addingFeed, setAddingFeed] = useState(false);
  const [summarizingId, setSummarizingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch feeds on mount
  useEffect(() => {
    fetchFeeds();
  }, []);

  // Fetch entries when selectedFeedId changes
  useEffect(() => {
    fetchEntries(selectedFeedId);
  }, [selectedFeedId]);

  const fetchFeeds = async () => {
    setLoadingFeeds(true);
    try {
      const res = await fetch("/api/feeds");
      const json = await res.json();
      if (json.success) {
        setFeeds(json.data);
      } else {
        const err = json.error || "";
        setError(err.includes("Failed query") || err.includes("connection") ? "数据库连接失败或表未初始化，请在 Vercel 环境变量中配置正确的 DATABASE_URL" : err);
      }
    } catch (err) {
      setError("Failed to load feeds");
    } finally {
      setLoadingFeeds(false);
    }
  };

  const fetchEntries = async (feedId: string | null) => {
    setLoadingEntries(true);
    try {
      const url = feedId ? `/api/entries?feedId=${feedId}` : "/api/entries";
      const res = await fetch(url);
      const json = await res.json();
      if (json.success) {
        setEntries(json.data);
      } else {
        const err = json.error || "";
        setError(err.includes("Failed query") || err.includes("connection") ? "数据库连接失败或表未初始化，请在 Vercel 环境变量中配置正确的 DATABASE_URL" : err);
      }
    } catch (err) {
      setError("Failed to load entries");
    } finally {
      setLoadingEntries(false);
    }
  };

  const handleAddFeed = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFeedUrl.trim()) return;

    setAddingFeed(true);
    setError(null);
    try {
      const res = await fetch("/api/feeds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: newFeedUrl.trim() }),
      });
      const json = await res.json();
      if (json.success) {
        setNewFeedUrl("");
        await fetchFeeds();
        setSelectedFeedId(json.data.id);
      } else {
        const err = json.error || "";
        setError(err.includes("Failed query") || err.includes("connection") ? "数据库连接失败或表未初始化，请在 Vercel 环境变量中配置正确的 DATABASE_URL" : err);
      }
    } catch (err) {
      setError("Failed to add feed");
    } finally {
      setAddingFeed(false);
    }
  };

  const handleSummarize = async (entryId: string) => {
    setSummarizingId(entryId);
    try {
      const res = await fetch("/api/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entryId }),
      });
      const json = await res.json();
      if (json.success) {
        // Update local entry state with summary
        setEntries((prev) =>
          prev.map((item) =>
            item.id === entryId
              ? { ...item, summary: json.data.content, modelUsed: json.data.modelUsed }
              : item
          )
        );
      } else {
        setError(json.error);
      }
    } catch (err) {
      setError("Failed to generate summary");
    } finally {
      setSummarizingId(null);
    }
  };

  return (
    <div className="flex h-screen bg-black text-white font-sans overflow-hidden">
      {/* Sidebar: Feeds Management */}
      <aside className="w-80 border-r border-zinc-800 flex flex-col bg-zinc-950">
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded bg-[#002FA7] flex items-center justify-center text-white font-bold shadow-lg shadow-[#002FA7]/30">
              <Rss className="h-4 w-4" />
            </div>
            <span className="font-bold tracking-wider text-lg">KOIRA RSS</span>
          </div>
          <span className="text-xs px-2 py-0.5 rounded bg-red-500/20 text-red-400 font-semibold border border-red-500/30">
            AI v1.0
          </span>
        </div>

        {/* Add Feed Form */}
        <div className="p-4 border-b border-zinc-800 bg-zinc-900/50">
          <form onSubmit={handleAddFeed} className="flex gap-2">
            <Input
              placeholder="输入 RSS / Atom 链接..."
              value={newFeedUrl}
              onChange={(e) => setNewFeedUrl(e.target.value)}
              className="bg-black border-zinc-700 text-white placeholder:text-zinc-500 focus-visible:ring-[#002FA7]"
            />
            <Button
              type="submit"
              disabled={addingFeed}
              className="bg-[#002FA7] hover:bg-[#00258a] text-white shrink-0"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </form>
          {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
        </div>

        {/* Feed List */}
        <ScrollArea className="flex-1 p-2">
          <div className="space-y-1">
            <button
              onClick={() => setSelectedFeedId(null)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                selectedFeedId === null
                  ? "bg-[#002FA7] text-white shadow-md shadow-[#002FA7]/20"
                  : "text-zinc-400 hover:bg-zinc-900 hover:text-white"
              }`}
            >
              <Layers className="h-4 w-4" />
              <span>全部文章</span>
            </button>
            {feeds.map((feed) => (
              <button
                key={feed.id}
                onClick={() => setSelectedFeedId(feed.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left ${
                  selectedFeedId === feed.id
                    ? "bg-[#002FA7] text-white shadow-md shadow-[#002FA7]/20"
                    : "text-zinc-400 hover:bg-zinc-900 hover:text-white"
                }`}
              >
                <BookOpen className="h-4 w-4 shrink-0" />
                <span className="truncate">{feed.name}</span>
              </button>
            ))}
          </div>
        </ScrollArea>

        <div className="p-4 border-t border-zinc-800 text-xs text-zinc-500 flex justify-between items-center">
          <span>Serverless & Drizzle</span>
          <button onClick={fetchFeeds} className="hover:text-white transition-colors">
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>
      </aside>

      {/* Main Content: Entries & AI Summary */}
      <main className="flex-1 flex flex-col overflow-hidden bg-black">
        <header className="h-16 border-b border-zinc-800 flex items-center justify-between px-6 bg-zinc-950/50 backdrop-blur">
          <div>
            <h1 className="text-xl font-bold tracking-tight">
              {selectedFeedId
                ? feeds.find((f) => f.id === selectedFeedId)?.name || "订阅源文章"
                : "聚合资讯流"}
            </h1>
            <p className="text-xs text-zinc-400">
              实时抓取与 AI 智能精简摘要
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse"></span>
            <span className="text-xs text-zinc-400 font-mono">Live Feed</span>
          </div>
        </header>

        <ScrollArea className="flex-1 p-6">
          {loadingEntries ? (
            <div className="flex items-center justify-center h-64 text-zinc-500">
              加载中...
            </div>
          ) : entries.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-zinc-500 gap-2">
              <Rss className="h-10 w-10 text-zinc-700 mb-2" />
              <p>暂无文章。请在左侧添加 RSS 订阅源开始体验。</p>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto space-y-6">
              {entries.map((entry) => (
                <Card
                  key={entry.id}
                  className="bg-zinc-950 border-zinc-800 hover:border-zinc-700 transition-all shadow-xl"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <a
                          href={entry.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-lg font-semibold text-white hover:text-[#002FA7] transition-colors flex items-center gap-2 group"
                        >
                          {entry.title}
                          <ExternalLink className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity text-zinc-400" />
                        </a>
                        <div className="flex items-center gap-3 text-xs text-zinc-400">
                          {entry.author && <span>{entry.author}</span>}
                          {entry.publishedAt && (
                            <span>{new Date(entry.publishedAt).toLocaleDateString()}</span>
                          )}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleSummarize(entry.id)}
                        disabled={summarizingId === entry.id}
                        className="bg-[#002FA7] hover:bg-[#00258a] text-white shrink-0 gap-1.5 shadow-md shadow-[#002FA7]/20"
                      >
                        <Sparkles className="h-3.5 w-3.5 text-red-400" />
                        {summarizingId === entry.id ? "生成中..." : "AI 摘要"}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {entry.summary && (
                      <div className="p-4 rounded-lg bg-zinc-900/80 border border-[#002FA7]/30 text-sm leading-relaxed text-zinc-200 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-[#002FA7]"></div>
                        <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-[#002FA7] uppercase tracking-wider">
                          <Sparkles className="h-3.5 w-3.5 text-red-400" />
                          <span>AI 智能摘要 ({entry.modelUsed || "model"})</span>
                        </div>
                        <p>{entry.summary}</p>
                      </div>
                    )}
                    {entry.content && (
                      <div className="text-sm text-zinc-400 line-clamp-3 leading-relaxed">
                        {entry.content.replace(/<[^>]*>?/gm, "")}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>
      </main>
    </div>
  );
}
