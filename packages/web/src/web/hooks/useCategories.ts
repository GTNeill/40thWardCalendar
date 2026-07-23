import { useQuery } from "@tanstack/react-query";

export interface CategoryMeta {
  key: string;
  label: string;
  icon: string;
  color: string;
  group: string;
  order: number;
}

async function fetchCategories(): Promise<CategoryMeta[]> {
  const res = await fetch("/api/categories");
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

const FOUR_HOURS = 4 * 60 * 60 * 1000;

/**
 * Live category list + ordering, straight from categories.json (via
 * /api/categories) — sorted the same way as the admin page (/admincat).
 * Replaces the old approach of hardcoding category keys/groups in the
 * frontend, which silently went stale every time a category was added,
 * renamed, or reordered through the admin UI.
 */
export function useCategories() {
  return useQuery<CategoryMeta[], Error>({
    queryKey: ["categories"],
    queryFn: fetchCategories,
    staleTime: FOUR_HOURS,
    retry: 2,
  });
}

const GROUP_LABELS: Record<string, string> = {
  government: "Your Government",
  community: "Your Community",
};

export function groupLabel(group: string): string {
  return GROUP_LABELS[group] ?? group;
}

/**
 * Builds the same shape as the old hardcoded CATEGORY_GROUPS, but derived
 * live from the current category order/group fields. Group *sections*
 * appear in the order their first member category appears overall (so
 * Government naturally stays first as long as "ward" or another government
 * category sits at order 0, matching current behavior without hardcoding).
 */
export function buildCategoryGroups(categories: CategoryMeta[]): { label: string; keys: string[] }[] {
  const sorted = [...categories].sort((a, b) => a.order - b.order);
  const groupOrder: string[] = [];
  const byGroup = new Map<string, string[]>();

  for (const cat of sorted) {
    if (!byGroup.has(cat.group)) {
      byGroup.set(cat.group, []);
      groupOrder.push(cat.group);
    }
    byGroup.get(cat.group)!.push(cat.key);
  }

  return groupOrder.map(group => ({
    label: groupLabel(group),
    keys: byGroup.get(group)!,
  }));
}
