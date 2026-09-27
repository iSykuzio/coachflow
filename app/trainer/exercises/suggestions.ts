export const CATEGORY_SUGGESTIONS = ["Strength", "Core", "Conditioning", "Mobility"];

export const MUSCLE_SUGGESTIONS = [
  "Chest",
  "Back",
  "Shoulders",
  "Biceps",
  "Triceps",
  "Forearms",
  "Quads",
  "Hamstrings",
  "Glutes",
  "Calves",
  "Core",
  "Full body",
  "Hips",
];

export const EQUIPMENT_SUGGESTIONS = [
  "Barbell",
  "Dumbbell",
  "Cable",
  "Machine",
  "Bodyweight",
  "Kettlebell",
  "Resistance band",
  "Cardio",
  "No equipment",
];

export function mergeSuggestions(base: string[], extra: Array<string | null | undefined>) {
  const seen = new Set<string>();
  const values: string[] = [];
  for (const value of [...base, ...extra]) {
    const trimmed = value?.trim() ?? "";
    const key = trimmed.toLowerCase();
    if (!trimmed || seen.has(key)) continue;
    seen.add(key);
    values.push(trimmed);
  }
  return values.sort((a, b) => a.localeCompare(b));
}
