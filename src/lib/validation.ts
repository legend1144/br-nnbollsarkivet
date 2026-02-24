import { z } from "zod";

export const requestCodeSchema = z.object({
  email: z.string().email(),
});

export const verifyCodeSchema = z.object({
  email: z.string().email(),
  code: z.string().regex(/^\d{6}$/),
});

export const profileUpdateSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  strengths: z.string().max(1000).optional().nullable(),
  weaknesses: z.string().max(1000).optional().nullable(),
  otherInfo: z.string().max(2000).optional().nullable(),
  profileImageUrl: z.string().url().optional().nullable(),
});

export const newsCreateSchema = z.object({
  title: z.string().min(3).max(200),
  excerpt: z.string().max(500).optional().nullable(),
  content: z.string().min(20),
  coverImageUrl: z.string().url().optional().nullable(),
  status: z.enum(["draft", "published"]).default("draft"),
});

export const archiveCreateSchema = z.object({
  title: z.string().min(3).max(200),
  content: z.string().min(20),
  category: z.string().min(2).max(80),
  tags: z.array(z.string().min(1).max(40)).default([]),
  status: z.enum(["draft", "published"]).default("draft"),
});

export const archiveTabCreateSchema = z.object({
  title: z.string().min(2).max(120),
  slug: z.string().min(2).max(120).optional(),
  description: z.string().max(500).optional().nullable(),
  introMarkdown: z.string().max(20000).optional().nullable(),
  isActive: z.boolean().optional().default(true),
});

export const archiveTabUpdateSchema = archiveTabCreateSchema.partial().extend({
  order: z.number().int().min(0).optional(),
});

export const archiveTabsReorderSchema = z.object({
  tabIds: z.array(z.string().min(1)).min(1),
});

export const calendarEventSchema = z
  .object({
    title: z.string().min(2).max(160),
    description: z.string().max(1000).optional().nullable(),
    eventType: z.enum(["training", "match"]),
    startAt: z.string().datetime(),
    endAt: z.string().datetime(),
    location: z.string().max(200).optional().nullable(),
  })
  .refine((value) => new Date(value.endAt).getTime() > new Date(value.startAt).getTime(), {
    message: "Sluttid måste vara efter starttid.",
    path: ["endAt"],
  });

const tacticPlayerSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(120),
  number: z.string().optional(),
  role: z.string().optional(),
  isBurner: z.boolean().optional(),
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  radius: z.number().min(0).max(0.5).optional(),
});

const tacticPassChainSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(120),
  playerIds: z.array(z.string().min(1)).min(2),
});

const tacticConeSchema = z.object({
  id: z.string().min(1),
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
});

export const tacticBoardSchema = z.object({
  players: z.array(tacticPlayerSchema).default([]),
  passChains: z.array(tacticPassChainSchema).default([]),
  cones: z.array(tacticConeSchema).length(4),
});
