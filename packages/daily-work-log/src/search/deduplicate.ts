import type { CategorizedItem, IssueCategory, PrCategory } from "../github/search.js";

const ISSUE_CATEGORY_PRIORITY: IssueCategory[] = ["created", "assignedCreated", "authoredUpdated", "assignedUpdated"];
const PR_CATEGORY_PRIORITY: PrCategory[] = ["created", "authoredUpdated", "reviewed"];

export function deduplicateSearchResults(items: CategorizedItem[]): CategorizedItem[] {
  const map = new Map<number, CategorizedItem>();

  for (const item of items) {
    const existing = map.get(item.item.id);
    if (!existing) {
      map.set(item.item.id, item);
    } else {
      for (const cat of item.categories) {
        existing.categories.add(cat);
      }
      existing.isPr = existing.isPr || item.isPr;
      if (item.item.updated_at > existing.item.updated_at) {
        existing.item = item.item;
      }
    }
  }

  return Array.from(map.values());
}

export function pickBestCategory(categories: Set<string>, isPr: boolean): string {
  const priority = isPr ? PR_CATEGORY_PRIORITY : ISSUE_CATEGORY_PRIORITY;
  for (const cat of priority) {
    if (categories.has(cat)) return cat;
  }
  return [...categories][0] ?? "unknown";
}
