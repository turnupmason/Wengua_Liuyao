// 古籍原文读取与逐字比对（构建与规则核对共用）
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export const ROOT = new URL('../..', import.meta.url).pathname.replace(/^\/(\w:)/, '$1');

const PUNCT = /[\s，。、；：？！“”‘’「」『』（）《》〈〉【】﹐﹑﹔﹕﹖·…—\-'",.;:?!()[\]<>＝=]/gu;
export const normalize = (s) => String(s).replace(PUNCT, '');

const cache = new Map();
export function chapterText(book, chapter) {
  if (!cache.has(book)) cache.set(book, readFileSync(join(ROOT, 'sources/classics', `${book}.md`), 'utf8'));
  const lines = cache.get(book).split(/\r?\n/);
  const [heading, anchor] = chapter.split('·');
  const start = lines.findIndex((l) => l === `## ${heading}`);
  if (start < 0) return null;
  let end = lines.findIndex((l, i) => i > start && l.startsWith('## '));
  if (end < 0) end = lines.length;
  let section = lines.slice(start + 1, end);
  if (anchor) {
    const a = section.findIndex((l) => l.trim() === anchor || l.trim().startsWith(anchor));
    if (a < 0) return null;
    section = section.slice(a);
  }
  return section.join('\n');
}

export function quoteFound(book, chapter, quote) {
  const sec = chapterText(book, chapter);
  return sec !== null && normalize(sec).includes(normalize(quote));
}
