const BANNED = [
  "nigg", "nigr", "fag", "faggot", "retard", "tranny", "kike", "spic", "chink", "gook", "wetback", "coon", "dyke",
  "nazi", "hitler", "kkk", "rape", "rapist", "pedo", "cunt", "fuck", "shit", "bitch", "whore", "slut", "cock", "dick",
  "pussy", "penis", "vagina", "porn", "cum", "admin", "moderator", "mooncade", "official", "support",
];
const LEET: Record<string, string> = { "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "8": "b", "9": "g" };

export const TAG_RE = /^[A-Z0-9_]{3,12}$/;

export function normalizeTag(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9_]/g, "").slice(0, 12);
}

export function tagProblem(tag: string): string | null {
  if (!TAG_RE.test(tag)) return "Use 3–12 letters, numbers or _.";
  const flat = tag.toLowerCase().replace(/_/g, "").replace(/[0-9]/g, (d) => LEET[d] ?? d);
  if (BANNED.some((w) => flat.includes(w))) return "Pick a different tag.";
  return null;
}

export const displayTag = (tag: string, id: string) => `${tag}·${id.slice(0, 3).toUpperCase()}`;
