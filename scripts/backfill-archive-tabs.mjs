import { PrismaClient } from "@prisma/client";

function tryLoadEnv(path) {
  if (typeof process.loadEnvFile !== "function") {
    return;
  }
  try {
    process.loadEnvFile(path);
  } catch (error) {
    if (!(error && typeof error === "object" && "code" in error && error.code === "ENOENT")) {
      throw error;
    }
  }
}

if (typeof process.loadEnvFile === "function") {
  tryLoadEnv(".env");
  tryLoadEnv(".env.local");
}

const prisma = new PrismaClient();

function slugify(value) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const defaults = [
  {
    slug: "inledning",
    title: "Inledning",
    description: "Grundinformation och overgripande riktlinjer.",
    introMarkdown: "## Inledning\n\nGemensam bas for hur laget arbetar.",
    order: 0,
  },
  {
    slug: "mal",
    title: "Mal",
    description: "Fokusomraden och malbilder for laget.",
    introMarkdown: "## Mal\n\nPrioriterade malbilder for sasonen.",
    order: 1,
  },
  {
    slug: "taktik",
    title: "Taktik",
    description: "Kuraterade taktiska riktlinjer och scenarier.",
    introMarkdown: "## Taktik\n\nOversikt av spelide och scenarioarbete.",
    order: 2,
  },
];

function mapCategoryToTabSlug(category) {
  const normalized = category.trim().toLowerCase();
  if (normalized === "mal") return "mal";
  if (normalized === "taktik") return "taktik";
  return "inledning";
}

async function ensureBaseTabs() {
  for (const tab of defaults) {
    await prisma.archiveTab.upsert({
      where: { slug: tab.slug },
      update: {
        title: tab.title,
        description: tab.description,
        order: tab.order,
      },
      create: {
        slug: tab.slug,
        title: tab.title,
        description: tab.description,
        introMarkdown: tab.introMarkdown,
        order: tab.order,
        isActive: true,
      },
    });
  }
}

async function backfillArticles() {
  const tabs = await prisma.archiveTab.findMany();
  const tabBySlug = new Map(tabs.map((tab) => [tab.slug, tab]));
  const source = await prisma.archiveArticle.findMany({
    orderBy: [{ createdAt: "asc" }, { title: "asc" }],
    select: {
      slug: true,
      title: true,
      content: true,
      category: true,
    },
  });

  let createdCount = 0;
  for (const article of source) {
    const tabSlug = mapCategoryToTabSlug(article.category);
    const tab = tabBySlug.get(tabSlug) ?? tabBySlug.get("inledning");
    if (!tab) continue;

    const existing = await prisma.archiveTabSection.findUnique({
      where: { legacySlug: article.slug },
      select: { id: true },
    });
    if (existing) {
      continue;
    }

    const order = await prisma.archiveTabSection.count({ where: { tabId: tab.id } });
    await prisma.archiveTabSection.create({
      data: {
        tabId: tab.id,
        slug: slugify(article.slug || article.title) || `sektion-${order + 1}`,
        title: article.title,
        bodyMarkdown: article.content,
        order,
        legacySlug: article.slug,
      },
    });
    createdCount += 1;
  }
  return createdCount;
}

async function main() {
  await ensureBaseTabs();
  const createdCount = await backfillArticles();
  console.log(`Backfill klar. Nya sektioner skapade: ${createdCount}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
