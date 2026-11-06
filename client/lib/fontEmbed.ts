/**
 * Builds the @font-face CSS html-to-image needs, but only for the web-font
 * files a node actually uses. Google Fonts splits Noto Sans KR into ~500
 * unicode-range slices; embedding all of them made a capture take ~10s.
 */

const FACE_RE = /@font-face\s*{[^}]*}/g;
const dataUrls = new Map<string, Promise<string>>();
const cssTexts = new Map<string, Promise<string>>();

/** Google Fonts stylesheets pulled in with @import (global.css). */
function fontSheetUrls(): string[] {
  const urls = new Set<string>();
  for (const sheet of Array.from(document.styleSheets)) {
    let rules: CSSRuleList;
    try {
      rules = sheet.cssRules;
    } catch {
      continue; // cross-origin sheet
    }
    for (const rule of Array.from(rules)) {
      if (rule instanceof CSSImportRule && rule.href.includes("fonts.googleapis.com")) {
        urls.add(rule.href);
      }
    }
    if (sheet.href?.includes("fonts.googleapis.com")) urls.add(sheet.href);
  }
  return [...urls];
}

function parseRanges(value: string): [number, number][] {
  return value.split(",").map((part) => {
    const [a, b] = part.trim().replace(/^u\+/i, "").split("-");
    const lo = parseInt(a.replace(/\?/g, "0"), 16);
    const hi = b ? parseInt(b, 16) : parseInt(a.replace(/\?/g, "f"), 16);
    return [lo, hi];
  });
}

function toDataUrl(url: string): Promise<string> {
  let p = dataUrls.get(url);
  if (!p) {
    p = fetch(url)
      .then((r) => r.blob())
      .then(
        (blob) =>
          new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          }),
      );
    dataUrls.set(url, p);
  }
  return p;
}

function cssText(url: string): Promise<string> {
  let p = cssTexts.get(url);
  if (!p) {
    p = fetch(url).then((r) => r.text());
    cssTexts.set(url, p);
  }
  return p;
}

interface Face {
  block: string;
  family: string;
  weight: number;
  ranges: [number, number][] | null;
  src: string;
}

export async function fontEmbedCss(node: HTMLElement): Promise<string> {
  // families and weights the node renders with, and the characters it shows
  const used = new Map<string, Set<number>>();
  for (const el of [node, ...Array.from(node.querySelectorAll<HTMLElement>("*"))]) {
    const cs = getComputedStyle(el);
    const family = cs.fontFamily.split(",")[0].trim().replace(/["']/g, "");
    if (!used.has(family)) used.set(family, new Set());
    used.get(family)!.add(Number(cs.fontWeight) || 400);
  }
  const chars = Array.from(new Set(Array.from(node.textContent ?? "", (c) => c.codePointAt(0)!)));

  const faces: Face[] = [];
  for (const css of await Promise.all(fontSheetUrls().map(cssText))) {
    for (const block of css.match(FACE_RE) ?? []) {
      const family = block.match(/font-family:\s*['"]?([^;'"]+)/)?.[1];
      const src = block.match(/url\(([^)]+)\)/)?.[1]?.replace(/["']/g, "");
      if (!family || !src || !used.has(family)) continue;
      const range = block.match(/unicode-range:\s*([^;]+)/)?.[1];
      faces.push({
        block,
        family,
        weight: Number(block.match(/font-weight:\s*(\d+)/)?.[1] ?? 400),
        ranges: range ? parseRanges(range) : null,
        src,
      });
    }
  }

  // for each used weight take the closest weight the stylesheet offers
  const wanted = new Set<string>();
  for (const [family, weights] of used) {
    const offered = [...new Set(faces.filter((f) => f.family === family).map((f) => f.weight))];
    if (!offered.length) continue;
    for (const w of weights) {
      const best = offered.reduce((a, b) => (Math.abs(b - w) < Math.abs(a - w) ? b : a));
      wanted.add(`${family}|${best}`);
    }
  }

  const picked = faces.filter(
    (f) =>
      wanted.has(`${f.family}|${f.weight}`) &&
      (!f.ranges || chars.some((c) => f.ranges!.some(([lo, hi]) => c >= lo && c <= hi))),
  );
  const blocks = await Promise.all(
    picked.map(async (f) => f.block.replace(/url\([^)]+\)/, `url(${await toDataUrl(f.src)})`)),
  );
  return blocks.join("\n");
}
