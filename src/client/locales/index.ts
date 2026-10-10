import { en, enPlayful, enTitleFrames } from "./en";
import { vi, viPlayful, viTitleFrames } from "./vi";
import { visualTitleFrames } from "./visual";
import { zh, zhPlayful, zhTitleFrames } from "./zh";

export type { CopyKey, TitleContent, TitleFrameKey, WelcomeEntry } from "./zh";

// One registration supplies the menu, browser-language matching and copy.
export const locales = {
  vi: { name: "Tiếng Việt", short: "VI", tag: "vi-VN", copy: vi, titleFrames: viTitleFrames, playful: viPlayful },
  en: { name: "English", short: "EN", tag: "en", copy: en, titleFrames: enTitleFrames, playful: enPlayful },
  zh: { name: "简体中文", short: "中", tag: "zh-CN", copy: zh, titleFrames: zhTitleFrames, playful: zhPlayful },
};
export type Lang = keyof typeof locales;

export function isLang(value: unknown): value is Lang {
  return typeof value === "string" && Object.hasOwn(locales, value);
}

export function resolveLang(language?: string): Lang {
  const tag = language?.toLowerCase();
  const exact = (Object.keys(locales) as Lang[]).find((key) =>
    key.toLowerCase() === tag || locales[key].tag.toLowerCase() === tag);
  const base = tag?.split("-")[0];
  return exact ?? (isLang(base) ? base : "vi");
}

// The native Piik App currently supports Chinese, English and visual-only copy.
// Keep its existing protocol compatible while the browser interface supports Vietnamese.
export function consoleLanguage(lang: Lang, visual: boolean): "zh" | "en" | "vis" {
  return visual ? "vis" : lang === "zh" ? "zh" : "en";
}

export { visualTitleFrames };
