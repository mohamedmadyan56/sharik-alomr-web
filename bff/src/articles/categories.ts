const CATEGORY_NAME_EN: Record<string, string> = {
  marriage_tips: 'Marriage tips',
  sharia: 'Sharia',
  psychology: 'Relationship psychology',
  success_stories: 'Success stories',
};

export function categoryNameEn(key: string, fallback: string): string {
  return CATEGORY_NAME_EN[key] ?? fallback;
}
