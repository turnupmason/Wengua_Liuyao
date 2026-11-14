// 三枚铜钱起卦（R-COIN）。口径依《卜筮正宗·以钱代蓍法》：
// 「一背为单画、二背为拆画、三背为重画○、三字为交画×，自下装上。」
// 换算：背记 3（阳）、字记 2（阴），三钱之和即 6/7/8/9：
//   三背 = 9 老阳（重，动而变阴）；一背 = 7 少阳（单，不动）；二背 = 8 少阴（拆，不动）；三字 = 6 老阴（交，动而变阳）。

export const COIN_CONVENTION = Object.freeze({
  id: 'coin-bushizhengzong-v1',
  ruleIds: ['R-COIN-01'],
  faceValues: Object.freeze({ 背: 3, 字: 2 }),
  description: '背记3、字记2；一背为单(7)、二背为拆(8)、三背为重(9)、三字为交(6)；自初爻起掷六次',
});

const VALUE_INFO = Object.freeze({
  6: Object.freeze({ value: 6, name: '老阴', mark: '交', yinYang: 0, moving: true }),
  7: Object.freeze({ value: 7, name: '少阳', mark: '单', yinYang: 1, moving: false }),
  8: Object.freeze({ value: 8, name: '少阴', mark: '拆', yinYang: 0, moving: false }),
  9: Object.freeze({ value: 9, name: '老阳', mark: '重', yinYang: 1, moving: true }),
});

export function lineValueInfo(value) {
  const info = VALUE_INFO[value];
  if (!info) throw new Error(`爻值必须是 6/7/8/9，收到 ${value}`);
  return info;
}

/** 一次掷钱（三枚，各为「背」或「字」）-> 爻值 */
export function lineFromCoins(coins) {
  if (!Array.isArray(coins) || coins.length !== 3 || coins.some((c) => c !== '背' && c !== '字')) {
    throw new Error('每次必须是三枚铜钱，面值为「背」或「字」');
  }
  const backs = coins.filter((c) => c === '背').length;
  const value = coins.reduce((s, c) => s + COIN_CONVENTION.faceValues[c], 0);
  return { coins: [...coins], backs, value, ...lineValueInfo(value) };
}

function defaultRandomBits(n) {
  const c = globalThis.crypto;
  if (!c || typeof c.getRandomValues !== 'function') throw new Error('当前环境没有 crypto.getRandomValues，无法真实摇卦');
  const bytes = new Uint8Array(n);
  c.getRandomValues(bytes);
  return [...bytes].map((b) => b & 1);
}

/**
 * 自动摇卦：真实产生 6 次 × 3 枚的随机结果，逐次记录原始面值与换算过程。
 * @param {object} [opts]
 * @param {(n:number)=>number[]} [opts.randomBits] 返回 n 个 0/1 的随机源（测试可注入；默认 crypto）
 */
export function castWithCoins({ randomBits = defaultRandomBits } = {}) {
  const bits = randomBits(18);
  if (!Array.isArray(bits) || bits.length !== 18 || bits.some((b) => b !== 0 && b !== 1)) throw new Error('随机源必须返回 18 个 0/1');
  const throws = [];
  for (let i = 0; i < 6; i += 1) {
    const coins = bits.slice(i * 3, i * 3 + 3).map((b) => (b === 1 ? '背' : '字'));
    throws.push({ line: i + 1, ...lineFromCoins(coins) });
  }
  return { method: 'three-coins-auto', convention: COIN_CONVENTION.id, throws, lineValues: throws.map((t) => t.value) };
}

/** 用户实掷铜钱后逐次录入（自初爻起） */
export function castFromRecordedCoins(coinThrows) {
  if (!Array.isArray(coinThrows) || coinThrows.length !== 6) throw new Error('必须录入六次掷钱结果，自初爻起');
  const throws = coinThrows.map((coins, i) => ({ line: i + 1, ...lineFromCoins(coins) }));
  return { method: 'three-coins-recorded', convention: COIN_CONVENTION.id, throws, lineValues: throws.map((t) => t.value) };
}
