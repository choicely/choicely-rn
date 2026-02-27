const ACCENT_COLORS = [
  "#ff4d6d",
  "#e03131",
  "#343a40",
  "#f08c00",
  "#20c997",
  "#339af0",
  "#845ef7",
];

const stripHtml = (value = "") =>
  value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

const extractArticleText = (content = []) => {
  if (!Array.isArray(content)) return "";
  const blocks = content
    .filter((item) => item?.type === "text" && item?.text)
    .map((item) => stripHtml(item.text))
    .filter(Boolean);
  return blocks.join("\n\n");
};

export const normalizeBlueprints = (blueprints = []) =>
  blueprints.map((item, index) => {
    const images = Array.isArray(item.images) ? item.images : [];
    const heroImageKey =
      images[0]?.key || item.article?.image?.key || item.icon?.key || null;
    const thumbImageKeys = images
      .slice(0, 3)
      .map((image) => image?.key)
      .filter(Boolean);
    const iconKey = item.icon?.key || null;

    return {
      key: item.key || item.brand_key || `template-${index}`,
      brandKey: item.brand_key,
      title: item.title || "Template name",
      description: item.description || "Short description",
      label: (item.title || "Template").toUpperCase(),
      heroImageKey,
      thumbImageKeys,
      iconKey,
      accent: ACCENT_COLORS[index % ACCENT_COLORS.length],
      updatedAt: item.updated || item.created || null,
      articleText: extractArticleText(item.article?.content || []),
      articleTitle: item.article?.title || null,
    };
  });
