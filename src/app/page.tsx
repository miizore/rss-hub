"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Rss, Sparkles, ExternalLink, RefreshCw, Layers, BookOpen, FolderPlus, ChevronRight, X, ArrowLeft } from "lucide-react";

interface Feed {
  id: string;
  name: string;
  url: string;
  description?: string;
  icon?: string;
  category: string;
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
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [newFeedUrl, setNewFeedUrl] = useState("");
  const [newFeedCategory, setNewFeedCategory] = useState("默认分类");
  const [loadingFeeds, setLoadingFeeds] = useState(false);
  const [loadingEntries, setLoadingEntries] = useState(false);
  const [addingFeed, setAddingFeed] = useState(false);
  const [summarizingId, setSummarizingId] = useState<string | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<Entry | null>(null); // For Reader View
  const [error, setError] = useState<string | null>(null);

  // Fetch feeds on mount
  useEffect(() => {
    fetchFeeds();
  }, []);

  // Fetch entries when selectedFeedId or selectedCategory changes
  useEffect(() => {
    fetchEntries(selectedFeedId, selectedCategory);
  }, [selectedFeedId, selectedCategory]);

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

  const fetchEntries = async (feedId: string | null, category: string | null) => {
    setLoadingEntries(true);
    try {
      let url = "/api/entries";
      if (feedId) {
        url += `?feedId=${feedId}`;
      }
      const res = await fetch(url);
      const json = await res.json();
      if (json.success) {
        let data: Entry[] = json.data;
        if (category && !feedId) {
          // Filter by category feeds
          const feedIdsInCat = feeds.filter((f) => f.category === category).map((f) => f.id);
          data = data.filter((item) => feedIdsInCat.includes(item.feedId));
        }
        setEntries(data);
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
        body: JSON.stringify({ url: newFeedUrl.trim(), category: newFeedCategory.trim() || "默认分类" }),
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

  const handleSummarize = async (entryId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSummarizingId(entryId);
    try {
      const res = await fetch("/api/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entryId }),
      });
      const json = await res.json();
      if (json.success) {
        setEntries((prev) =>
          prev.map((item) =>
            item.id === entryId
              ? { ...item, summary: json.data.content, modelUsed: json.data.modelUsed }
              : item
          )
        );
        if (selectedEntry && selectedEntry.id === entryId) {
          setSelectedEntry((prev) => prev ? { ...prev, summary: json.data.content, modelUsed: json.data.modelUsed } : null);
        }
      } else {
        setError(json.error);
      }
    } catch (err) {
      setError("Failed to generate summary");
    } finally {
      setSummarizingId(null);
    }
  };

  // Group feeds by category
  const categories = Array.from(new Set(feeds.map((f) => f.category || "默认分类")));

  return (
    <div className="flex h-screen bg-black text-white font-sans overflow-hidden">
      {/* Sidebar: Feeds & Categories Management */}
      <aside className="w-80 border-r border-zinc-800 flex flex-col bg-zinc-950 shrink-0">
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded bg-[#002FA7] flex items-center justify-center text-white font-bold shadow-lg shadow-[#002FA7]/30">
              <Rss className="h-4 w-4" />
            </div>
            <span className="font-bold tracking-wider text-lg">KOIRA RSS</span>
          </div>
          <span className="text-xs px-2 py-0.5 rounded bg-red-600/30 text-[#FF1744] font-bold border border-[#FF1744]/40 shadow-sm shadow-[#FF1744]/20">
            AI v1.0
          </span>
        </div>

        {/* Add Feed Form */}
        <div className="p-4 border-b border-zinc-800 bg-zinc-900/50 space-y-2">
          <form onSubmit={handleAddFeed} className="space-y-2">
            <Input
              placeholder="输入 RSS / Atom 链接..."
              value={newFeedUrl}
              onChange={(e) => setNewFeedUrl(e.target.value)}
              className="bg-black border-zinc-700 text-white placeholder:text-zinc-500 focus-visible:ring-[#002FA7]"
            />
            <div className="flex gap-2">
              <Input
                placeholder="分类名称 (如: 技术)"
                value={newFeedCategory}
                onChange={(e) => setNewFeedCategory(e.target.value)}
                className="bg-black border-zinc-700 text-white placeholder:text-zinc-500 text-xs h-8 focus-visible:ring-[#002FA7]"
              />
              <Button
                type="submit"
                disabled={addingFeed}
                className="bg-[#002FA7] hover:bg-[#00258a] text-white shrink-0 h-8 px-3"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </form>
          {error && <p className="text-xs text-[#FF1744] font-medium">{error}</p>}
        </div>

        {/* Navigation List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-4">
          <div>
            <button
              onClick={() => {
                setSelectedFeedId(null);
                setSelectedCategory(null);
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                selectedFeedId === null && selectedCategory === null
                  ? "bg-[#002FA7] text-white shadow-md shadow-[#002FA7]/20"
                  : "text-zinc-400 hover:bg-zinc-900 hover:text-white"
              }`}
            >
              <Layers className="h-4 w-4" />
              <span>全部文章</span>
            </button>
          </div>

          {/* Categories & Feeds */}
          <div className="space-y-3">
            {categories.map((cat) => {
              const catFeeds = feeds.filter((f) => (f.category || "默认分类") === cat);
              return (
                <div key={cat} className="space-y-1">
                  <div
                    onClick={() => {
                      setSelectedCategory(cat);
                      setSelectedFeedId(null);
                    }}
                    className={`flex items-center justify-between px-3 py-1.5 text-xs font-semibold uppercase tracking-wider rounded cursor-pointer transition-colors ${
                      selectedCategory === cat && selectedFeedId === null
                        ? "text-white bg-zinc-900"
                        : "text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    <span>{cat}</span>
                    <span className="text-[10px] bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-400">
                      {catFeeds.length}
                    </span>
                  </div>
                  <div className="pl-2 space-y-1 border-l border-zinc-800 ml-2 mt-1">
                    {catFeeds.map((feed) => (
                      <button
                        key={feed.id}
                        onClick={() => {
                          setSelectedFeedId(feed.id);
                          setSelectedCategory(cat);
                        }}
                        className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-medium transition-colors text-left truncate ${
                          selectedFeedId === feed.id
                            ? "bg-[#002FA7] text-white shadow-md shadow-[#002FA7]/20"
                            : "text-zinc-400 hover:bg-zinc-900/80 hover:text-white"
                        }`}
                      >
                        <BookOpen className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{feed.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="p-4 border-t border-zinc-800 text-xs text-zinc-500 flex justify-between items-center bg-zinc-950">
          <span>KOIRA v1.0</span>
          <button onClick={fetchFeeds} className="hover:text-white transition-colors">
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>
      </aside>

      {/* Main Content Area: Split between Entries List and In-App Reader View */}
      <main className="flex-1 flex overflow-hidden bg-black">
        {/* Left: Entries List */}
        <div className={`flex-1 flex flex-col h-full border-r border-zinc-800 overflow-hidden ${selectedEntry ? "hidden lg:flex lg:w-1/2" : "w-full"}`}>
          <header className="h-16 border-b border-zinc-800 flex items-center justify-between px-6 bg-zinc-950/50 backdrop-blur shrink-0">
            <div>
              <h1 className="text-xl font-bold tracking-tight">
                {selectedFeedId
                  ? feeds.find((f) => f.id === selectedFeedId)?.name || "订阅源文章"
                  : selectedCategory
                  ? `分类: ${selectedCategory}`
                  : "聚合资讯流"}
              </h1>
              <p className="text-xs text-zinc-400">
                点击任意文章可在右侧直接阅读全文与 AI 摘要
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="h-2 w-2 rounded-full bg-[#FF1744] animate-pulse"></span>
              <span className="text-xs text-zinc-400 font-mono">Live Feed</span>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto p-6">
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
              <div className="max-w-3xl mx-auto space-y-4">
                {entries.map((entry) => (
                  <div
                    key={entry.id}
                    onClick={() => setSelectedEntry(entry)}
                    className={`p-4 rounded-xl bg-zinc-950 border transition-all cursor-pointer shadow-lg group hover:border-[#002FA7] ${
                      selectedEntry?.id === entry.id ? "border-[#002FA7] bg-zinc-900/60" : "border-zinc-800"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1.5 flex-1">
                        <h2 className="text-base font-semibold text-white group-hover:text-[#002FA7] transition-colors line-clamp-2">
                          {entry.title}
                        </h2>
                        <div className="flex items-center gap-3 text-xs text-zinc-400">
                          {entry.author && <span>{entry.author}</span>}
                          {entry.publishedAt && (
                            <span>{new Date(entry.publishedAt).toLocaleDateString()}</span>
                          )}
                          {entry.summary && (
                            <span className="text-[#FF1744] font-medium flex items-center gap-1">
                              <Sparkles className="h-3 w-3" /> 已生成摘要
                            </span>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-zinc-600 group-hover:text-[#002FA7] transition-colors shrink-0 mt-1" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: In-App Reader View (Full Article & AI Summary) */}
        {selectedEntry && (
          <div className="flex-1 flex flex-col h-full bg-zinc-950 overflow-hidden w-full lg:w-1/2">
            <header className="h-16 border-b border-zinc-800 flex items-center justify-between px-6 bg-zinc-900/50 backdrop-blur shrink-0">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedEntry(null)}
                  className="lg:hidden text-zinc-400 hover:text-white -ml-2"
                >
                  <ArrowLeft className="h-4 w-4 mr-1" /> 返回
                </Button>
                <span className="text-xs uppercase tracking-wider text-zinc-400 font-semibold">
                  阅读视图
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => handleSummarize(selectedEntry.id)}
                  disabled={summarizingId === selectedEntry.id}
                  className="bg-[#002FA7] hover:bg-[#00258a] text-white gap-1.5 shadow-md shadow-[#002FA7]/20 text-xs h-8"
                >
                  <Sparkles className="h-3.5 w-3.5 text-[#FF1744]" />
                  {summarizingId === selectedEntry.id ? "生成中..." : "AI 摘要"}
                </Button>
                <a
                  href={selectedEntry.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors"
                  title="在浏览器打开原文"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedEntry(null)}
                  className="text-zinc-400 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto p-8 space-y-6">
              <div className="space-y-3 max-w-2xl mx-auto">
                <h1 className="text-2xl font-bold text-white tracking-tight leading-snug">
                  {selectedEntry.title}
                </h1>
                <div className="flex items-center gap-4 text-xs text-zinc-400 border-b border-zinc-800 pb-4">
                  {selectedEntry.author && <span>作者: {selectedEntry.author}</span>}
                  {selectedEntry.publishedAt && (
                    <span>发布时间: {new Date(selectedEntry.publishedAt).toLocaleString()}</span>
                  )}
                </div>
              </div>

              {/* AI Summary Section */}
              {selectedEntry.summary && (
                <div className="p-5 rounded-xl bg-zinc-900/90 border border-[#002FA7]/40 text-sm leading-relaxed text-zinc-100 relative overflow-hidden max-w-2xl mx-auto shadow-xl">
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-[#002FA7]"></div>
                  <div className="flex items-center gap-2 mb-2 text-xs font-bold text-[#002FA7] uppercase tracking-wider">
                    <Sparkles className="h-4 w-4 text-[#FF1744]" />
                    <span>AI 智能精简摘要 ({selectedEntry.modelUsed || "model"})</span>
                  </div>
                  <p className="whitespace-pre-line">{selectedEntry.summary}</p>
                </div>
              )}

              {/* Full Content Section */}
              <div className="max-w-2xl mx-auto pt-2">
                <h3 className="text-xs uppercase tracking-wider text-zinc-500 font-semibold mb-3">
                  全文内容
                </h3>
                {selectedEntry.content ? (
                  <div
                    className="prose prose-invert max-w-none text-zinc-300 text-sm leading-relaxed space-y-4 [&_a]:text-[#002FA7] [&_a]:underline [&_img]:max-w-full [&_img]:rounded-lg"
                    dangerouslySetInnerHTML={{ __html: selectedEntry.content }}
                  />
                ) : (
                  <p className="text-sm text-zinc-500 italic">该文章暂无正文内容，请点击右上角访问原文链接查看。</p>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
