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
  const [headingRaw, anchor] = chapter.split('·');
  // 同名小节可写「标题@N」取第 N 处（如断易天机「天玄赋@2」为占仕宦下的天玄赋）
  const m = headingRaw.match(/^(.*)@(\d+)$/);
  const heading = m ? m[1] : headingRaw;
  const nth = m ? Number(m[2]) : 1;
  let start = -1;
  for (let i = 0, seen = 0; i < lines.length; i += 1) if (lines[i] === `## ${heading}` && ++seen === nth) { start = i; break; }
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
