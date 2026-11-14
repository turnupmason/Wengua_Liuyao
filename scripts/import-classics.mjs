// 从六爻研究项目 D:\Wengua_LLM 复制「仅原文」的古籍清洗本，并写出带版本锚的清单 sources/manifest.json。
// 用法：node scripts/import-classics.mjs [Wengua_LLM 路径]
// 注意：sources/modern/（现代白话、点校者注释）一律不复制，不作出处。
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';

const LLM = process.argv[2] || 'D:/Wengua_LLM';
const OUT = new URL('../sources/classics/', import.meta.url);
mkdirSync(OUT, { recursive: true });

const sha = (buf) => createHash('sha256').update(buf).digest('hex');

// 版本锚：维基文库两页在 2026-11-13 抓取时的最新修订号（API 查询所得）
const WIKISOURCE_REVISIONS = {
  增删卜易: { title: '增刪卜易', revid: 2572918, revisionTimestamp: '2025-06-25T11:25:59Z', revisionSha1: 'ffbbd9d6ce640ef6f07319b7e39127c85ef95490' },
  黄金策: { title: '黄金策', revid: 2452958, revisionTimestamp: '2024-09-11T07:24:58Z', revisionSha1: 'b918820a6985386a949f7303a4ccb7f84dab3c0f' },
};

const BOOKS = [
  { book: '增删卜易', author: '野鹤老人著，李文辉（觉子）增删', era: '清', raw: 'wikisource/增删卜易.json', role: 'primary',
    caveats: ['维基文库「原剑录入本」：录入者自称据错谬较多的地摊本与白话本对照整理、未仔细校对；录入者篇首增补的《纳甲歌》《起六神诀》等已在清洗时剔除，不作出处。', '卷二以后部分段落用全角「﹐」等标点，系录入格式，不影响文字。', '已知录入错字见 rules/collation.json（如世应章「天地观」、浑天甲子章「辰在内」）。'] },
  { book: '卜筮正宗', author: '王洪绪', era: '清', raw: 'yanyilundao/卜筮正宗.json', role: 'primary',
    caveats: ['yanyilundao 录入本，含王洪绪原注与《黄金策》注、十八问答；装卦口径（纳甲装卦歌、安世应诀、六兽起例、以钱代蓍法）以本书为据。', '六十四卦名离宫三世误作「水火未济」，见校勘 C-004。'] },
  { book: '黄金策', author: '题明刘基', era: '明（题）', raw: 'wikisource/黄金策.json', role: 'primary',
    caveats: ['维基文库本据《卜筮正宗》本录入。', '总断千金赋末尾「用世弱,待生旺月日以成事」等十二行用半角逗号与白话「的」字，系后人插入的应期摘要，不是原文，不作出处（校勘 C-005）。'] },
  { book: '易隐', author: '曹九锡', era: '清', raw: 'yanyilundao/易隐.json', role: 'secondary', caveats: ['yanyilundao 录入本。'] },
  { book: '火珠林', author: '题麻衣道者', era: '宋（题）', raw: 'yanyilundao/火珠林.json', role: 'secondary', caveats: ['yanyilundao 录入本；本书不载铜钱起卦诀，起卦口径取卜筮正宗。'] },
  { book: '断易天机', author: '徐绍锦校正', era: '明', raw: 'yanyilundao/断易天机.json', role: 'secondary', caveats: ['yanyilundao 虎易点校本；现代译文与虎易注已在清洗时剔除，原书注保留。'] },
  { book: '易林补遗', author: '张世宝', era: '明', raw: 'yanyilundao/易林补遗.json', role: 'secondary', caveats: ['yanyilundao 录入本。'] },
  { book: '京氏易传', author: '京房撰，陆绩注', era: '汉', raw: 'yanyilundao/京氏易传.json', role: 'reference', caveats: ['yanyilundao 录入本，含陆绩注与录入者编号注释标记（①②③），引用时只取正文。'] },
  { book: '周易', author: '', era: '先秦', raw: 'yanyilundao/周易.json', role: 'reference', caveats: ['卦名与经文参考，不参与纳甲断法。'] },
  { book: '卜筮正宗全书', author: '王洪绪', era: '清', raw: 'zhiming/卜筮正宗全书.json', role: 'collation', caveats: ['知命书院导出本，标点与断句噪声较多（如「地水。师为山」），只用于与卜筮正宗 yanyilundao 本互校，不单独作出处。'] },
  { book: '卜筮全书', author: '姚际隆删补', era: '明', raw: 'yanyilundao/卜筮全书.json', role: 'collation', caveats: ['虎易点校本，现代评注已剔除；只用于互校掷钱歌诀。'] },
];

const manifest = { generated: new Date().toISOString().slice(0, 10), importedFrom: 'D:/Wengua_LLM/sources/clean（只含原文的清洗本）', books: [] };
for (const b of BOOKS) {
  // 统一为 LF，保证仓库内文件与清单哈希一致（.gitattributes eol=lf）
  const text = Buffer.from(readFileSync(join(LLM, 'sources/clean', `${b.book}.md`), 'utf8').replace(/\r\n/g, '\n'), 'utf8');
  const raw = readFileSync(join(LLM, 'sources/raw', b.raw));
  const rawJson = JSON.parse(raw.toString('utf8'));
  writeFileSync(new URL(`${b.book}.md`, OUT), text);
  const chapters = text.toString('utf8').split('\n').filter((l) => l.startsWith('## ')).length;
  manifest.books.push({
    book: b.book,
    file: `sources/classics/${b.book}.md`,
    author: b.author,
    era: b.era,
    role: b.role,
    site: rawJson.source,
    fetched: rawJson.fetched,
    firstChapterUrl: rawJson.chapters?.[0]?.url ?? null,
    wikisource: WIKISOURCE_REVISIONS[b.book] ?? null,
    rawSha256: sha(raw),
    cleanSha256LF: sha(text),
    chapterHeadings: chapters,
    caveats: b.caveats,
  });
}
writeFileSync(new URL('../sources/manifest.json', import.meta.url), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`复制 ${manifest.books.length} 部古籍原文，清单写入 sources/manifest.json`);
