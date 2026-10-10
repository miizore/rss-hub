import { pgTable, serial, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

export const feeds = pgTable("feeds", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  url: text("url").notNull().unique(),
  description: text("description"),
  icon: text("icon"),
  category: varchar("category", { length: 100 }).default("默认分类").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const entries = pgTable("entries", {
  id: uuid("id").defaultRandom().primaryKey(),
  feedId: uuid("feed_id")
    .references(() => feeds.id, { onDelete: "cascade" })
    .notNull(),
  title: text("title").notNull(),
  link: text("link").notNull().unique(),
  content: text("content"),
  thumbnail: text("thumbnail"),
  author: varchar("author", { length: 255 }),
  publishedAt: timestamp("published_at"),
  guid: text("guid").unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const summaries = pgTable("summaries", {
  id: uuid("id").defaultRandom().primaryKey(),
  entryId: uuid("entry_id")
    .references(() => entries.id, { onDelete: "cascade" })
    .notNull()
    .unique(),
  content: text("content").notNull(),
  modelUsed: varchar("model_used", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
