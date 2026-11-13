import { SKINS } from "./catalog";
import { opponentFor } from "./opponents";

export type Skin = (typeof SKINS)[number];
export const SKIN_LIST: readonly Skin[] = SKINS;
export type CaseId = string;
export type Case = {
  id: CaseId;
  name: string;
  en: string;
  tag: string;
  tagEn: string;
  price: number;
  level: number;
  color: string;
  pool: readonly number[];
  art?: string;
  fixed?: readonly number[];
};
export const LEVEL_XP = [
  0, 50, 200, 500, 1000, 1800, 2900, 4400, 6400, 9000,
] as const;
export const MULTI_LEVELS: Readonly<Record<number, number>> = {
  1: 1,
  2: 3,
  3: 5,
  5: 8,
};
export function canOpenQuantity(level: number, count: number) {
  return (
    Number.isInteger(count) &&
    count in MULTI_LEVELS &&
    level >= MULTI_LEVELS[count]
  );
}
export const FREE_INTERVAL = 600_000;
// Item resale is a currency sink over repeated openings; rare wins remain possible.
export const CASE_RTP = 0.88;
export const CASE_PROFIT_CHANCE = 0.35;
export const CASE_XP = 10;
export const UPGRADE_XP = 12;
export const CONTRACT_XP = 20;
export const AIM_HIT_INTERVAL = 350;
export type AimUpgrade = "reward" | "target" | "combo";
export const CASES: readonly Case[] = [
  {
    id: "street",
    name: "Уличный",
    en: "Street",
    tag: "Граффити и городские скины",
    tagEn: "Graffiti & streetwear",
    price: 50,
    level: 1,
    color: "#b7ee4c",
    pool: [0, 1, 2, 3, 4, 5, 6, 7, 10, 11],
  },
  {
    id: "neon",
    name: "Неоновый",
    en: "Neon",
    tag: "Неонуар и яркие расцветки",
    tagEn: "Neo-Noir & vibrant finishes",
    price: 150,
    level: 2,
    color: "#b38aff",
    pool: [2, 3, 4, 5, 7, 9, 11, 12, 15, 21],
  },
  {
    id: "redline",
    name: "Красная линия",
    en: "Redline",
    tag: "Красные акценты и карбон",
    tagEn: "Red accents & carbon",
    price: 500,
    level: 3,
    color: "#ff697c",
    pool: [1, 2, 12, 13, 14, 17, 23, 37, 38, 59, 64],
  },
  {
    id: "frost",
    name: "Ледяной",
    en: "Frost",
    tag: "Холодная палитра и снайперки",
    tagEn: "Cold finishes & sniper rifles",
    price: 1200,
    level: 4,
    color: "#86e5ff",
    pool: [0, 16, 24, 27, 33, 47, 48, 62],
  },
  {
    id: "gold",
    name: "Золотая лихорадка",
    en: "Gold Rush",
    tag: "Перчатки, ножи и редкие скины",
    tagEn: "Gloves, knives & rare finishes",
    price: 3500,
    level: 5,
    color: "#f2c66f",
    pool: [44, 49, 43, 45, 46, 55, 56, 31, 71, 72],
  },
  {
    id: "storm",
    name: "В центре шторма",
    en: "Eye of the Storm",
    tag: "Легендарные ножи и топовый дроп",
    tagEn: "Legendary knives & ultimate drops",
    price: 10000,
    level: 6,
    color: "#6eb6ff",
    pool: [15, 17, 19, 21, 23, 24, 26, 28, 29, 30, 31, 32, 33, 34],
  },
  {
    id: "budget",
    name: "Первый дроп",
    en: "First Drop",
    tag: "Недорогой старт без лишнего риска",
    tagEn: "An affordable start",
    price: 35,
    level: 1,
    color: "#7bd8ad",
    art: "street",
    pool: [0, 1, 2, 3, 35, 36],
  },
  {
    id: "pistols",
    name: "Карманная коллекция",
    en: "Pocket Collection",
    tag: "Только пистолеты — от P250 до Deagle",
    tagEn: "Pistols only, from P250 to Deagle",
    price: 100,
    level: 1,
    color: "#f3b4b0",
    art: "redline",
    pool: [0, 1, 2, 5, 35, 11, 48, 54, 37, 21, 25, 45],
  },
  {
    id: "snipers",
    name: "Один выстрел",
    en: "One Shot",
    tag: "AWP, SSG 08 и снайперские легенды",
    tagEn: "AWP, SSG 08 & sniper legends",
    price: 180,
    level: 2,
    color: "#9ac7ec",
    art: "frost",
    pool: [4, 13, 53, 51, 19, 39, 52, 32, 33, 67, 68],
  },
  {
    id: "noir",
    name: "Ночной комикс",
    en: "Midnight Comic",
    tag: "Неонуар, гонщики и город после полуночи",
    tagEn: "Neo-Noir & neon street racers",
    price: 500,
    level: 3,
    color: "#e788dc",
    art: "neon",
    pool: [9, 11, 15, 42, 41],
  },
  {
    id: "beast",
    name: "Выпусти зверя",
    en: "Unleash the Beast",
    tag: "Только коллекция Hyper Beast",
    tagEn: "The Hyper Beast collection only",
    price: 1800,
    level: 3,
    color: "#a2e962",
    art: "street",
    pool: [60, 39, 40, 66],
  },
  {
    id: "hotrod",
    name: "Красная зона",
    en: "Red Zone",
    tag: "Глянцевый красный и горячий металл",
    tagEn: "Glossy reds & hot metal",
    price: 400,
    level: 2,
    color: "#ff5f56",
    art: "redline",
    pool: [1, 38, 64, 37, 23],
  },
  {
    id: "asiimov",
    name: "Орбитальная станция",
    en: "Orbital Station",
    tag: "Только Азимов: AWP, P90 и M4A4",
    tagEn: "Asiimov only: AWP, P90 & M4A4",
    price: 5500,
    level: 4,
    color: "#ffad71",
    art: "frost",
    pool: [19, 20, 65],
  },
  {
    id: "monochrome",
    name: "Чёрным по белому",
    en: "Black on White",
    tag: "Сланец, Механо-пушки и Printstream",
    tagEn: "Slate, Mecha Industries & Printstream",
    price: 1500,
    level: 4,
    color: "#e2e8ed",
    art: "storm",
    pool: [8, 10, 18, 21, 22, 25],
  },
  {
    id: "flame",
    name: "Драконье пламя",
    en: "Dragonfire",
    tag: "Пламя, драконы и топливные инжекторы",
    tagEn: "Flames, dragons & fuel injectors",
    price: 1500,
    level: 4,
    color: "#ff9c52",
    art: "gold",
    pool: [63, 44, 51, 52, 45, 43, 32, 69, 70],
  },
  {
    id: "knives",
    name: "Острый характер",
    en: "Cut Above",
    tag: "Каждое открытие — нож. Без оружия.",
    tagEn: "Every drop is a knife. No guns.",
    price: 15000,
    level: 5,
    color: "#cbb1ff",
    art: "neon",
    pool: [57, 56, 55, 58, 29, 30, 31],
  },
  {
    id: "gloves",
    name: "Ручная работа",
    en: "Handpicked",
    tag: "Только перчатки: клетка, Амфибия, Порок",
    tagEn: "Gloves only: Plaid, Amphibious & Vice",
    price: 22000,
    level: 6,
    color: "#e4a2da",
    art: "gold",
    pool: [26, 27, 28],
  },
  {
    id: "split",
    name: "Пан или пропал",
    en: "Double or Dust",
    tag: "50% AWP Красная линия · 50% P250",
    tagEn: "50% AWP Redline · 50% P250",
    price: Math.round((20 + 800) / 2 / CASE_RTP),
    level: 3,
    color: "#f7ca7d",
    art: "redline",
    pool: [0, 13],
    fixed: [0.5, 0.5],
  },
  {
    id: "dragon50",
    name: "Дракон или пыль",
    en: "Dragon or Dust",
    tag: "50% Dragon Lore · 50% P250",
    tagEn: "50% Dragon Lore · 50% P250",
    price: Math.round((20 + 80000) / 2 / CASE_RTP),
    level: 6,
    color: "#f4cb74",
    art: "gold",
    pool: [0, 32],
    fixed: [0.5, 0.5],
  },
  {
    id: "jade",
    name: "Нефрит",
    en: "Jade",
    tag: "Зелёный лотос",
    tagEn: "Green lotus",
    price: 5000,
    level: 5,
    color: "#6bdbb2",
    art: "jade",
    pool: [6, 16, 23, 24, 34, 46, 55],
  },
  {
    id: "abyss",
    name: "Бездна",
    en: "Abyss",
    tag: "Синие глубины",
    tagEn: "Ocean depths",
    price: 8000,
    level: 6,
    color: "#51a9e9",
    art: "abyss",
    pool: [4, 24, 27, 29, 30, 33, 47],
  },
  {
    id: "volcano",
    name: "Вулкан",
    en: "Volcano",
    tag: "Огненная коллекция",
    tagEn: "Fire collection",
    price: 11000,
    level: 7,
    color: "#ff915e",
    art: "flame",
    pool: [37, 43, 45, 52, 55, 58, 69],
  },
  {
    id: "diamond",
    name: "Алмазный",
    en: "Diamond",
    tag: "Редкие драгоценности",
    tagEn: "Rare gems",
    price: 22000,
    level: 7,
    color: "#88ddfa",
    art: "diamond",
    pool: [22, 23, 26, 27, 28, 29, 30, 31, 32, 33],
  },
  {
    id: "prism",
    name: "Призма",
    en: "Prism",
    tag: "Градиенты и волны",
    tagEn: "Fades & Dopplers",
    price: 28000,
    level: 7,
    color: "#c3a0ff",
    art: "prism",
    pool: [11, 15, 28, 29, 30, 31, 58],
  },
  {
    id: "moon",
    name: "Лунный",
    en: "Lunar",
    tag: "Холодный металл",
    tagEn: "Cold metal",
    price: 9000,
    level: 8,
    color: "#bdcde8",
    art: "moon",
    pool: [21, 22, 24, 25, 27, 30, 33],
  },
  {
    id: "sun",
    name: "Солнечный",
    en: "Solar",
    tag: "Золото и пламя",
    tagEn: "Gold & flame",
    price: 18000,
    level: 8,
    color: "#f6cf70",
    art: "sun",
    pool: [43, 45, 46, 55, 56, 58, 31, 32],
  },
  {
    id: "seraph",
    name: "Серафим",
    en: "Seraph",
    tag: "Белая коллекция",
    tagEn: "White collection",
    price: 25000,
    level: 8,
    color: "#eee3d5",
    art: "seraph",
    pool: [8, 18, 21, 22, 25, 30, 31, 33],
  },
  {
    id: "phoenix",
    name: "Феникс",
    en: "Phoenix",
    tag: "Легенды огня",
    tagEn: "Legends of fire",
    price: 16000,
    level: 9,
    color: "#f37a6f",
    art: "phoenix",
    pool: [23, 37, 45, 52, 55, 58, 32],
  },
  {
    id: "crown",
    name: "Корона",
    en: "Crown",
    tag: "Королевская коллекция",
    tagEn: "Royal collection",
    price: 40000,
    level: 9,
    color: "#87d5ac",
    art: "crown",
    pool: [25, 26, 28, 29, 30, 31, 32, 33, 34],
  },
  {
    id: "tiger",
    name: "Тигриный",
    en: "Tiger",
    tag: "Зуб тигра и золотые клинки",
    tagEn: "Tiger teeth & golden blades",
    price: 10000,
    level: 9,
    color: "#e9b572",
    art: "tiger",
    pool: [44, 46, 55, 56, 58, 71],
  },
  {
    id: "cosmos",
    name: "Космос",
    en: "Cosmos",
    tag: "На вершине коллекции",
    tagEn: "Top of the collection",
    price: 55000,
    level: 10,
    color: "#8ca4fb",
    art: "cosmos",
    pool: [24, 28, 29, 30, 31, 32, 33, 34],
  },
  {
    id: "emperor",
    name: "Император",
    en: "Emperor",
    tag: "Самые редкие скины",
    tagEn: "The rarest skins",
    price: 65000,
    level: 10,
    color: "#f1cc83",
    art: "emperor",
    pool: [26, 29, 30, 31, 32, 33, 34],
  },
  {
    id: "relic",
    name: "Реликвия",
    en: "Relic",
    tag: "Ножи и легендарные AWP",
    tagEn: "Knives & legendary AWPs",
    price: 35000,
    level: 10,
    color: "#d69cf2",
    art: "relic",
    pool: [21, 25, 29, 30, 31, 32, 33],
  },
];
export type Owned = { uid: number; skinId: number };
export type Pending = {
  id: number;
  kind: "case" | "upgrade" | "wheel" | "battle" | "contract" | "levelReward";
  skinIds: number[];
  uids: number[];
  success: boolean;
  roll: number;
  chance: number;
  sourceValue: number;
  caseId: CaseId;
  bonusCoins: number;
  bonusXp: number;
  wheelIndex?: number;
  playerDrops?: number[];
  botDrops?: number[];
  battleCases?: CaseId[];
  contractMin?: number;
  contractMax?: number;
  newSkinIds?: number[];
  newBest?: boolean;
  previousLevel?: number;
  opponentId?: string;
  rewardLevel?: number;
  adRecoveryClaimed?: boolean;
  adWheelClaimed?: boolean;
};
export type Save = {
  version: 1;
  coins: number;
  xp: number;
  opened: number;
  upgradeAttempts: number;
  upgradeWins: number;
  battles: number;
  battleWins: number;
  clicks: number;
  farmLevel: number;
  aimSizeLevel: number;
  aimComboLevel: number;
  aimStreak: number;
  aimBestStreak: number;
  aimIncome: number;
  orientation: "auto" | "portrait" | "landscape";
  language: "auto" | "ru" | "en";
  aimHits: number;
  farmMs: number;
  holdMs: number;
  holdBonuses: number;
  contracts: number;
  questClaims: string[];
  levelRewards: number[];
  giftAt: number[];
  inventory: Owned[];
  nextUid: number;
  nextEvent: number;
  freeAt: number;
  wheelAt: number;
  dailyAt: number;
  caseAdAt: number;
  recoveryAt: number;
  lastAdAt: number;
  boostUntil: number;
  tickets: number;
  seen: number[];
  recent: number[];
  bestSkin: number | null;
  pending: Pending | null;
  receipts: string[];
  sound: boolean;
  fast: boolean;
};
const int = (n: unknown, max = 1e12) =>
  typeof n === "number" && Number.isFinite(n)
    ? Math.min(max, Math.max(0, Math.floor(n)))
    : 0;
const validSkin = (n: unknown): n is number =>
  Number.isInteger(n) && Number(n) >= 0 && Number(n) < SKINS.length;
export function levelFor(xp: number) {
  let level = 1;
  for (let i = 1; i < LEVEL_XP.length; i++)
    if (xp >= LEVEL_XP[i]) level = i + 1;
  return level;
}
export function caseFor(id: string): Case {
  const c = CASES.find((c) => c.id === id);
  if (!c) throw Error("case");
  return c;
}
export function skin(id: number): Skin {
  const s = SKINS[id];
  if (!s) throw Error("skin");
  return s;
}
export function priceOf(items: readonly Owned[]) {
  return items.reduce((n, i) => n + skin(i.skinId).price, 0);
}

/** Two independently verified targets: long-run item value and the chance of a profitable drop.
 * Weights are fixed per case, never adjusted for the player, ads, balance, or recent results.
 * Contracts retain their separate profile via the explicit arguments at the call site.
 */
export function oddsFor(
  c: Case,
  targetRtp = CASE_RTP,
  profitChance: number | null = CASE_PROFIT_CHANCE,
): number[] {
  if (c.fixed) return [...c.fixed];
  const values = c.pool.map((id) => skin(id).price / c.price),
    indexes = values.map((_, i) => i);
  const groups =
    profitChance === null
      ? [{ indexes, mass: 1 }]
      : [
          { indexes: indexes.filter((i) => values[i] > 1), mass: profitChance },
          {
            indexes: indexes.filter((i) => values[i] <= 1),
            mass: 1 - profitChance,
          },
        ];
  if (
    groups.some(
      (g) => !g.indexes.length || g.mass <= g.indexes.length * 0.00001,
    )
  )
    throw Error("case-balance:" + c.id);
  const expected = (lambda: number) => {
    const probabilities = values.map(() => 0);
    for (const group of groups) {
      const logs = group.indexes.map((i) => -lambda * values[i]),
        max = Math.max(...logs),
        weights = logs.map((v) => Math.exp(v - max)),
        sum = weights.reduce((a, b) => a + b, 0);
      group.indexes.forEach((index, j) => {
        probabilities[index] =
          0.00001 +
          ((group.mass - group.indexes.length * 0.00001) * weights[j]) / sum;
      });
    }
    return {
      weights: probabilities,
      mean: probabilities.reduce((sum, p, i) => sum + p * values[i], 0),
    };
  };
  let low = -100,
    high = 100;
  if (
    profitChance !== null &&
    (expected(high).mean > targetRtp + 1e-9 ||
      expected(low).mean < targetRtp - 1e-9)
  )
    throw Error("case-balance:" + c.id);
  for (let i = 0; i < 100; i++) {
    const middle = (low + high) / 2;
    if (expected(middle).mean > targetRtp) low = middle;
    else high = middle;
  }
  return expected((low + high) / 2).weights;
}
const ODDS = new Map(CASES.map((c) => [c.id, oddsFor(c)]));
export function caseStats(c: Case) {
  const probabilities = ODDS.get(c.id) ?? oddsFor(c);
  return {
    rtp: probabilities.reduce(
      (total, p, i) => total + (p * skin(c.pool[i]).price) / c.price,
      0,
    ),
    profitChance: probabilities.reduce(
      (total, p, i) => total + (skin(c.pool[i]).price > c.price ? p : 0),
      0,
    ),
  };
}
export function pick(c: Case, u: number) {
  if (!Number.isFinite(u) || u < 0 || u >= 1) throw Error("random");
  const odds = ODDS.get(c.id)!;
  let total = 0;
  for (let i = 0; i < c.pool.length; i++) {
    total += odds[i];
    if (u < total) return c.pool[i];
  }
  return c.pool[c.pool.length - 1];
}
const random = () => {
  if (typeof globalThis.crypto !== "undefined") {
    const a = new Uint32Array(1);
    crypto.getRandomValues(a);
    return a[0] / 4294967296;
  }
  return Math.random();
};

export class StormGame {
  state: Save;
  private lastTap = -Infinity;
  private lastAim = -Infinity;
  constructor(
    saved?: unknown,
    private rng: () => number = random,
  ) {
    const a = (
      saved && typeof saved === "object" ? saved : {}
    ) as Partial<Save>;
    const initial: Save = {
      version: 1,
      coins: 150,
      xp: 0,
      opened: 0,
      upgradeAttempts: 0,
      upgradeWins: 0,
      battles: 0,
      battleWins: 0,
      clicks: 0,
      farmLevel: 1,
      aimSizeLevel: 1,
      aimComboLevel: 1,
      aimStreak: 0,
      aimBestStreak: 0,
      aimIncome: 0,
      orientation: "auto",
      language: "auto",
      aimHits: 0,
      farmMs: 0,
      holdMs: 0,
      holdBonuses: 0,
      contracts: 0,
      questClaims: [],
      levelRewards: [],
      giftAt: [300000, 900000, 1800000].map((ms) => Date.now() + ms),
      inventory: [
        { uid: 1, skinId: 0 },
        { uid: 2, skinId: 1 },
        { uid: 3, skinId: 35 },
        { uid: 4, skinId: 36 },
      ],
      nextUid: 5,
      nextEvent: 1,
      freeAt: 0,
      wheelAt: 0,
      dailyAt: 0,
      caseAdAt: 0,
      recoveryAt: 0,
      lastAdAt: 0,
      boostUntil: 0,
      tickets: 0,
      seen: [0, 1, 35, 36],
      recent: [],
      bestSkin: null,
      pending: null,
      receipts: [],
      sound: true,
      fast: false,
    };
    this.state = initial;
    if (a.version !== 1) return;
    for (const key of [
      "coins",
      "xp",
      "opened",
      "upgradeAttempts",
      "upgradeWins",
      "battles",
      "battleWins",
      "clicks",
      "aimHits",
      "aimBestStreak",
      "aimIncome",
      "farmMs",
      "holdMs",
      "holdBonuses",
      "contracts",
      "freeAt",
      "wheelAt",
      "dailyAt",
      "caseAdAt",
      "recoveryAt",
      "lastAdAt",
      "boostUntil",
      "tickets",
    ] as const)
      initial[key] = int(
        a[key],
        [
          "freeAt",
          "wheelAt",
          "dailyAt",
          "boostUntil",
          "caseAdAt",
          "recoveryAt",
          "lastAdAt",
        ].includes(key)
          ? Number.MAX_SAFE_INTEGER
          : 1e12,
      );
    initial.farmLevel = Math.max(1, Math.min(20, int(a.farmLevel) || 1));
    initial.aimSizeLevel = Math.max(1, Math.min(10, int(a.aimSizeLevel) || 1));
    initial.aimComboLevel = Math.max(1, Math.min(8, int(a.aimComboLevel) || 1));
    initial.orientation = ["portrait", "landscape"].includes(
      String(a.orientation),
    )
      ? a.orientation!
      : "auto";
    initial.language = ["ru", "en"].includes(String(a.language))
      ? a.language!
      : "auto";
    initial.questClaims = Array.isArray(a.questClaims)
      ? a.questClaims.filter((x) => typeof x === "string").slice(0, 100)
      : [];
    initial.levelRewards = Array.isArray(a.levelRewards)
      ? [
          ...new Set(
            a.levelRewards.filter(
              (n) => Number.isInteger(n) && n >= 2 && n <= levelFor(initial.xp),
            ),
          ),
        ]
      : [];
    initial.giftAt = [0, 1, 2].map((i) =>
      Array.isArray(a.giftAt) ? int(a.giftAt[i], Number.MAX_SAFE_INTEGER) : 0,
    );
    const used = new Set<number>();
    initial.inventory = Array.isArray(a.inventory)
      ? a.inventory
          .filter(
            (i) =>
              i &&
              validSkin(i.skinId) &&
              int(i.uid) > 0 &&
              !used.has(i.uid) &&
              (used.add(i.uid), true),
          )
          .slice(0, 200)
          .map((i) => ({ uid: int(i.uid), skinId: i.skinId }))
      : [];
    initial.nextUid = Math.max(
      int(a.nextUid),
      ...initial.inventory.map((i) => i.uid + 1),
      1,
    );
    initial.nextEvent = Math.max(1, int(a.nextEvent));
    initial.seen = Array.isArray(a.seen)
      ? [...new Set(a.seen.filter(validSkin))]
      : [];
    initial.recent = Array.isArray(a.recent)
      ? a.recent.filter(validSkin).slice(0, 12)
      : [];
    initial.bestSkin = validSkin(a.bestSkin) ? a.bestSkin : null;
    initial.sound = a.sound !== false;
    initial.fast = a.fast === true;
    initial.receipts = Array.isArray(a.receipts)
      ? a.receipts.filter((r) => typeof r === "string").slice(-100)
      : [];
    const p = a.pending;
    if (
      p &&
      [
        "case",
        "upgrade",
        "wheel",
        "battle",
        "contract",
        "levelReward",
      ].includes(p.kind) &&
      (p.kind !== "levelReward" ||
        initial.levelRewards.includes(p.rewardLevel!)) &&
      Array.isArray(p.skinIds) &&
      p.skinIds.every(validSkin) &&
      Array.isArray(p.uids) &&
      p.uids.length === p.skinIds.length &&
      new Set(p.uids).size === p.uids.length &&
      p.uids.every((uid, i) =>
        initial.inventory.some(
          (item) => item.uid === uid && item.skinId === p.skinIds[i],
        ),
      ) &&
      CASES.some((c) => c.id === p.caseId) &&
      (p.kind !== "battle" ||
        (Array.isArray(p.playerDrops) &&
          Array.isArray(p.botDrops) &&
          [1, 2, 3, 5].includes(p.playerDrops.length) &&
          p.playerDrops.length === p.botDrops.length &&
          p.playerDrops.every(validSkin) &&
          p.botDrops.every(validSkin))) &&
      (p.kind !== "wheel" ||
        (Number.isInteger(p.wheelIndex) &&
          Number(p.wheelIndex) >= 0 &&
          Number(p.wheelIndex) < 8))
    ) {
      initial.pending = {
        ...p,
        id: int(p.id),
        skinIds: [...p.skinIds],
        uids: p.uids.filter((n) => Number.isInteger(n) && n > 0),
        roll: Number.isFinite(p.roll) && p.roll >= 0 && p.roll < 1 ? p.roll : 0,
        chance: Number.isFinite(p.chance)
          ? Math.max(0, Math.min(1, p.chance))
          : 0,
        sourceValue: int(p.sourceValue),
        adRecoveryClaimed: p.adRecoveryClaimed === true,
        adWheelClaimed: p.adWheelClaimed === true,
        bonusCoins: int(p.bonusCoins),
        bonusXp: int(p.bonusXp),
        ...(Array.isArray(p.playerDrops)
          ? { playerDrops: p.playerDrops.filter(validSkin) }
          : {}),
        ...(Array.isArray(p.botDrops)
          ? { botDrops: p.botDrops.filter(validSkin) }
          : {}),
        ...(Array.isArray(p.battleCases)
          ? {
              battleCases: p.battleCases.map((id) =>
                CASES.some((c) => c.id === id) ? id : p.caseId,
              ),
            }
          : {}),
        newSkinIds: Array.isArray(p.newSkinIds)
          ? [...new Set(p.newSkinIds.filter((id) => p.skinIds.includes(id)))]
          : [],
        newBest: p.newBest === true,
        ...(p.previousLevel
          ? {
              previousLevel: Math.max(
                1,
                Math.min(LEVEL_XP.length, int(p.previousLevel)),
              ),
            }
          : {}),
      };
      initial.nextEvent = Math.max(initial.nextEvent, initial.pending.id + 1);
    }
  }
  get level() {
    return levelFor(this.state.xp);
  }
  get currentCase(): Case {
    const ids = [
      "street",
      "neon",
      "redline",
      "frost",
      "gold",
      "storm",
      "volcano",
      "moon",
      "phoenix",
      "cosmos",
    ];
    return caseFor(ids[this.level - 1]);
  }
  get availableLevelRewards() {
    return Array.from({ length: this.level - 1 }, (_, i) => i + 2).filter(
      (n) => !this.state.levelRewards.includes(n),
    );
  }
  levelRewardPool(level: number) {
    const minimum = [
      0, 0, 800, 2200, 4500, 9500, 15000, 20000, 25000, 35000, 45000,
    ][level];
    if (!minimum) throw Error("locked");
    return SKIN_LIST.filter(
      (s) => s.price >= minimum && s.price <= minimum * 3,
    ).map((s) => s.id);
  }
  claimLevelReward(level: number) {
    this.idle();
    if (!this.availableLevelRewards.includes(level)) throw Error("locked");
    if (this.state.inventory.length >= 200) throw Error("capacity");
    const pool = this.levelRewardPool(level),
      u = this.rng();
    if (!Number.isFinite(u) || u < 0 || u >= 1) throw Error("random");
    const id = pool[Math.floor(u * pool.length)];
    this.state.levelRewards.push(level);
    return this.event("levelReward", this.currentCase, [id], {
      rewardLevel: level,
    });
  }
  get inventoryValue() {
    return priceOf(this.state.inventory);
  }
  snapshot(): Save {
    return JSON.parse(JSON.stringify(this.state));
  }
  private idle() {
    if (this.state.pending) throw Error("busy");
  }
  private add(ids: readonly number[]) {
    if (this.state.inventory.length + ids.length > 200) throw Error("capacity");
    const owned = ids.map((skinId) => ({ uid: this.state.nextUid++, skinId }));
    this.state.inventory.push(...owned);
    for (const id of ids) {
      if (!this.state.seen.includes(id)) this.state.seen.push(id);
      if (
        this.state.bestSkin === null ||
        skin(id).price > skin(this.state.bestSkin).price
      )
        this.state.bestSkin = id;
    }
    this.state.recent = [...ids]
      .reverse()
      .concat(this.state.recent)
      .slice(0, 12);
    return owned.map((i) => i.uid);
  }
  private event(
    kind: Pending["kind"],
    c: Case,
    ids: number[],
    values: Partial<Pending> = {},
  ): Pending {
    const newSkinIds = [
      ...new Set(ids.filter((id) => !this.state.seen.includes(id))),
    ];
    const newBest = ids.some(
      (id) =>
        this.state.bestSkin === null ||
        skin(id).price > skin(this.state.bestSkin).price,
    );
    const p: Pending = {
      id: this.state.nextEvent++,
      kind,
      skinIds: ids,
      uids: this.add(ids),
      success: true,
      roll: 0,
      chance: 1,
      sourceValue: 0,
      caseId: c.id,
      bonusCoins: 0,
      bonusXp: 0,
      adRecoveryClaimed: false,
      adWheelClaimed: false,
      newSkinIds,
      newBest,
      previousLevel: levelFor(
        Math.max(0, this.state.xp - (values.bonusXp ?? 0)),
      ),
      ...values,
    };
    this.state.pending = p;
    return p;
  }
  dismiss() {
    this.state.pending = null;
  }
  open(
    id: CaseId,
    count = 1,
    mode: "paid" | "free" | "ticket" | "caseAd" = "paid",
    now = Date.now(),
    rewardReceipt?: string,
  ): Pending {
    this.idle();
    const c = caseFor(id);
    if (c.level > this.level) throw Error("locked");
    if (!(count in MULTI_LEVELS) || !Number.isInteger(count))
      throw Error("quantity");
    if (!canOpenQuantity(this.level, count)) throw Error("quantity-locked");
    if (this.state.inventory.length + count > 200) throw Error("capacity");
    if (
      mode !== "paid" &&
      (count !== 1 || (mode !== "caseAd" && c.id !== this.currentCase.id))
    )
      throw Error("case");
    if (mode === "caseAd" && c.price > 500) throw Error("case");
    if (!Number.isFinite(now)) throw Error("cooldown");
    if (mode === "paid" && this.state.coins < c.price * count)
      throw Error("funds");
    if (
      (mode === "free" || mode === "caseAd") &&
      (!rewardReceipt || this.state.receipts.includes(rewardReceipt))
    )
      throw Error("receipt");
    if (mode === "free" && now < this.state.freeAt) throw Error("cooldown");
    if (mode === "caseAd" && now < this.state.caseAdAt) throw Error("cooldown");
    if (mode === "ticket" && this.state.tickets < 1) throw Error("tickets");
    // Resolve all RNG before the transaction, then commit coins, inventory and result together.
    const ids = Array.from({ length: count }, () => pick(c, this.rng()));
    if (mode === "paid") this.state.coins -= c.price * count;
    if (mode === "free") {
      this.receipt(rewardReceipt!);
      this.state.freeAt = now + FREE_INTERVAL;
    }
    if (mode === "ticket") this.state.tickets--;
    if (mode === "caseAd") {
      this.receipt(rewardReceipt!);
      this.state.caseAdAt = now + 180_000;
    }
    const before = this.state.opened;
    this.state.opened += count;
    this.state.xp += CASE_XP * count;
    let bonus = 0;
    for (const [threshold, coins] of [
      [3, 50],
      [10, 150],
      [25, 400],
    ])
      if (before < threshold && this.state.opened >= threshold) bonus += coins;
    this.state.coins += bonus;
    return this.event("case", c, ids, {
      sourceValue: mode === "paid" ? c.price * count : 0,
      bonusCoins: bonus,
      bonusXp: CASE_XP * count,
    });
  }
  quote(uids: number[], targetId: number, extra = 0) {
    if (
      uids.length < 1 ||
      uids.length > 6 ||
      new Set(uids).size !== uids.length
    )
      throw Error("selection");
    const owned = uids.map((uid) => {
      const i = this.state.inventory.find((i) => i.uid === uid);
      if (!i) throw Error("selection");
      return i;
    });
    if (!Number.isInteger(extra) || extra < 0 || extra > this.state.coins)
      throw Error("funds");
    const stake = priceOf(owned) + extra,
      target = skin(targetId);
    if (target.price <= stake) throw Error("target");
    const chance = Math.min(0.8, (0.95 * stake) / target.price);
    if (chance < 0.01) throw Error("chance");
    return { stake, target, chance, owned };
  }
  upgrade(uids: number[], targetId: number, extra = 0): Pending {
    this.idle();
    const q = this.quote(uids, targetId, extra),
      roll = this.rng();
    if (!Number.isFinite(roll) || roll < 0 || roll >= 1) throw Error("random");
    this.state.coins -= extra;
    this.state.inventory = this.state.inventory.filter(
      (i) => !uids.includes(i.uid),
    );
    const success = roll < q.chance;
    this.state.upgradeAttempts++;
    if (success) this.state.upgradeWins++;
    this.state.xp += UPGRADE_XP;
    return this.event("upgrade", this.currentCase, success ? [targetId] : [], {
      success,
      roll,
      chance: q.chance,
      sourceValue: q.stake,
      bonusXp: UPGRADE_XP,
    });
  }
  private owned(uids: number[]) {
    if (!uids.length || new Set(uids).size !== uids.length)
      throw Error("selection");
    return uids.map((uid) => {
      const i = this.state.inventory.find((i) => i.uid === uid);
      if (!i) throw Error("selection");
      return i;
    });
  }
  sell(uids: number[], receipt?: string) {
    this.idle();
    const items = this.owned(uids),
      base = priceOf(items);
    if (receipt && this.state.receipts.includes(receipt))
      throw Error("receipt");
    const bonus = receipt ? Math.floor(base * 0.5) : 0;
    this.state.inventory = this.state.inventory.filter(
      (i) => !uids.includes(i.uid),
    );
    this.state.coins += base + bonus;
    if (receipt) this.receipt(receipt);
    return base + bonus;
  }
  earn(now = Date.now()) {
    this.idle();
    if (!Number.isFinite(now) || now - this.lastTap < AIM_HIT_INTERVAL)
      return 0;
    this.lastTap = now;
    const amount = this.tapValue * (now < this.state.boostUntil ? 2 : 1);
    this.state.coins += amount;
    this.state.clicks++;
    return amount;
  }
  private receipt(id: string) {
    if (!id || this.state.receipts.includes(id)) throw Error("receipt");
    this.state.receipts.push(id);
    this.state.receipts = this.state.receipts.slice(-100);
  }
  adBonus(type: "ticket" | "boost" | "coins", id: string, now = Date.now()) {
    this.idle();
    this.receipt(id);
    if (type === "ticket") this.state.tickets++;
    else if (type === "coins") this.state.coins += this.adCoins;
    else this.state.boostUntil = now + 60_000;
  }
  daily(now = Date.now(), rewardReceipt?: string) {
    this.idle();
    if (!Number.isFinite(now)) throw Error("cooldown");
    if (now < this.state.dailyAt) throw Error("cooldown");
    if (rewardReceipt !== undefined) this.receipt(rewardReceipt);
    const amount =
      this.currentCase.price * (rewardReceipt !== undefined ? 2 : 1);
    this.state.coins += amount;
    this.state.dailyAt = now + 86_400_000;
    return amount;
  }
  recoveryQuote(now = Date.now()) {
    const p = this.state.pending;
    if (
      !Number.isFinite(now) ||
      !p ||
      p.success ||
      p.adRecoveryClaimed ||
      !["upgrade", "battle"].includes(p.kind) ||
      now < this.state.recoveryAt
    )
      return 0;
    return Math.min(500, Math.floor(p.sourceValue * 0.15));
  }
  recoverLoss(eventId: number, now: number, receipt: string) {
    const amount = this.recoveryQuote(now);
    if (!amount || this.state.pending?.id !== eventId) throw Error("cooldown");
    this.receipt(receipt);
    this.state.coins += amount;
    this.state.pending.adRecoveryClaimed = true;
    this.state.recoveryAt = now + 300_000;
    return amount;
  }
  wheelBonusQuote() {
    const p = this.state.pending;
    if (!p || p.kind !== "wheel" || p.adWheelClaimed) return null;
    if (p.bonusCoins > 0) return { coins: p.bonusCoins, tickets: 0 };
    if (Number(p.wheelIndex) >= 6) return { coins: 0, tickets: 1 };
    return null;
  }
  boostWheel(eventId: number, receipt: string) {
    const bonus = this.wheelBonusQuote();
    if (!bonus || this.state.pending?.id !== eventId) throw Error("cooldown");
    this.receipt(receipt);
    this.state.coins += bonus.coins;
    this.state.tickets += bonus.tickets;
    this.state.pending.adWheelClaimed = true;
    return bonus;
  }
  wheel(now = Date.now()): Pending {
    this.idle();
    if (now < this.state.wheelAt) throw Error("cooldown");
    const roll = this.rng();
    if (!Number.isFinite(roll) || roll < 0 || roll >= 1) throw Error("random");
    const index = Math.floor(roll * 8),
      c = this.currentCase;
    const coins =
      index < 4 ? Math.round(c.price * [0.2, 0.4, 0.6, 1][index]) : 0;
    const xp = index === 4 ? 10 : index === 5 ? 20 : 0;
    this.state.coins += coins;
    this.state.xp += xp;
    if (index >= 6) this.state.tickets++;
    this.state.wheelAt = now + 1_800_000;
    return this.event("wheel", c, [], {
      roll,
      wheelIndex: index,
      bonusCoins: coins,
      bonusXp: xp,
    });
  }
  get tapValue() {
    return this.aimBaseReward;
  }
  aimBaseRewardAt(level: number) {
    // Fixed linear income: case prices and collector XP never multiply hit value.
    return 4 + 2 * (Math.max(1, Math.min(20, level)) - 1);
  }
  get aimBaseReward() {
    return this.aimBaseRewardAt(this.state.farmLevel);
  }
  get farmCost() {
    return Math.ceil(400 * Math.pow(1.5, this.state.farmLevel - 1));
  }
  get adCoins() {
    return this.currentCase.price * 4;
  }
  farmUpgrade() {
    this.aimUpgrade("reward");
  }
  get aimTargetSize() {
    return 60 + (this.state.aimSizeLevel - 1) * 5;
  }
  get aimComboWindow() {
    return 1100 + (this.state.aimComboLevel - 1) * 150;
  }
  get aimMultiplier() {
    return (
      1 +
      Math.min(
        Math.floor(this.state.aimStreak / 5) * 0.05,
        this.aimMaxMultiplier - 1,
      )
    );
  }
  aimMaxMultiplierAt(level: number) {
    return (110 + 5 * (Math.max(1, Math.min(8, level)) - 1)) / 100;
  }
  get aimMaxMultiplier() {
    return this.aimMaxMultiplierAt(this.state.aimComboLevel);
  }
  aimReward(now = Date.now()) {
    // Round the ordinary payout first, so an advertised x2 always pays exactly twice.
    return (
      Math.ceil(this.aimBaseReward * this.aimMultiplier) *
      (now < this.state.boostUntil ? 2 : 1)
    );
  }
  aimUpgradeQuote(kind: AimUpgrade) {
    const level =
      kind === "reward"
        ? this.state.farmLevel
        : kind === "target"
          ? this.state.aimSizeLevel
          : this.state.aimComboLevel;
    const max = kind === "reward" ? 20 : kind === "target" ? 10 : 8;
    const cost =
      kind === "reward"
        ? this.farmCost
        : Math.ceil(
            (kind === "target" ? 600 : 900) *
              Math.pow(kind === "target" ? 1.85 : 2, level - 1),
          );
    const unlockLevel = kind === "reward" ? Math.floor(level / 2) + 1 : level;
    return { level, max, cost, unlockLevel, locked: this.level < unlockLevel };
  }
  aimUpgrade(kind: AimUpgrade) {
    this.idle();
    if (!["reward", "target", "combo"].includes(kind)) throw Error("selection");
    const q = this.aimUpgradeQuote(kind);
    if (q.level >= q.max || q.locked) throw Error("locked");
    if (this.state.coins < q.cost) throw Error("funds");
    this.state.coins -= q.cost;
    if (kind === "reward") this.state.farmLevel++;
    else if (kind === "target") this.state.aimSizeLevel++;
    else this.state.aimComboLevel++;
  }
  aim(now = Date.now()) {
    this.idle();
    if (!Number.isFinite(now) || now - this.lastAim < AIM_HIT_INTERVAL)
      return 0;
    this.state.aimStreak =
      now - this.lastAim <= this.aimComboWindow ? this.state.aimStreak + 1 : 1;
    this.lastAim = now;
    this.state.aimBestStreak = Math.max(
      this.state.aimBestStreak,
      this.state.aimStreak,
    );
    const gain = this.aimReward(now);
    this.state.coins += gain;
    this.state.aimIncome += gain;
    this.state.aimHits++;
    return gain;
  }
  missAim() {
    this.state.aimStreak = 0;
  }
  expireAim(now = Date.now()) {
    if (now - this.lastAim > this.aimComboWindow) this.state.aimStreak = 0;
  }
  /** Foreground training time only; holding and idle waiting never award coins. */
  farmTick(ms: number, _legacyHolding = false) {
    if (this.state.pending) return 0;
    this.state.farmMs += Math.min(1500, int(ms, 1500));
    this.state.holdMs = 0;
    return 0;
  }
  gift(index: number, now = Date.now(), rewardReceipt?: string) {
    this.idle();
    if (!Number.isInteger(index) || index < 0 || index > 2)
      throw Error("selection");
    if (now < this.state.giftAt[index]) throw Error("cooldown");
    if (!rewardReceipt || this.state.receipts.includes(rewardReceipt))
      throw Error("receipt");
    if (this.state.inventory.length >= 200) throw Error("capacity");
    const id = this.giftSkin(index);
    this.receipt(rewardReceipt);
    this.add([id]);
    this.state.giftAt[index] = now + [300000, 900000, 1800000][index];
    return id;
  }
  giftSkin(index: number) {
    const ceiling = this.currentCase.price * [0.6, 1.5, 3][index];
    return (
      [...SKINS]
        .filter((s) => s.price <= ceiling)
        .sort((a, b) => b.price - a.price)[0]?.id ?? 0
    );
  }
  tasks() {
    const defs = [
      {
        id: "clicks",
        ru: "Попади в 50 мишеней",
        en: "Hit 50 targets",
        goal: 50,
        value: this.state.clicks + this.state.aimHits,
        reward: 100,
      },
      {
        id: "aim",
        ru: "Попади в 15 мишеней",
        en: "Hit 15 targets",
        goal: 15,
        value: this.state.aimHits,
        reward: 150,
      },
      {
        id: "open",
        ru: "Открой 5 кейсов",
        en: "Open 5 cases",
        goal: 5,
        value: this.state.opened,
        reward: 150,
      },
      {
        id: "upgrade",
        ru: "Попробуй улучшить скин",
        en: "Try a skin upgrade",
        goal: 1,
        value: this.state.upgradeAttempts,
        reward: 100,
      },
      {
        id: "contract",
        ru: "Подпиши первый контракт",
        en: "Sign your first contract",
        goal: 1,
        value: this.state.contracts,
        reward: 200,
      },
      {
        id: "battle",
        ru: "Сыграй 3 батла с ботом",
        en: "Play 3 bot battles",
        goal: 3,
        value: this.state.battles,
        reward: 300,
      },
      {
        id: "farm",
        ru: "Проведи 5 минут в аимке",
        en: "Train your aim for 5 minutes",
        goal: 300000,
        value: this.state.farmMs,
        reward: 300,
      },
    ];
    return defs.map((q) => ({
      ...q,
      claimed: this.state.questClaims.includes(q.id),
    }));
  }
  claimTask(id: string, rewardReceipt?: string) {
    this.idle();
    const q = this.tasks().find((q) => q.id === id);
    if (!q || q.claimed || q.value < q.goal) throw Error("cooldown");
    if (rewardReceipt !== undefined) this.receipt(rewardReceipt);
    this.state.questClaims.push(id);
    const amount = q.reward * (rewardReceipt !== undefined ? 2 : 1);
    this.state.coins += amount;
    return amount;
  }
  contractQuote(uids: number[], extra = 0) {
    if (uids.length < 3 || uids.length > 10) throw Error("selection");
    const owned = this.owned(uids);
    if (!Number.isInteger(extra) || extra < 0 || extra > this.state.coins)
      throw Error("funds");
    const stake = priceOf(owned) + extra;
    const pool = SKINS.filter(
      (s) => s.price >= stake * 0.35 && s.price <= stake * 3,
    );
    if (pool.length < 2) throw Error("target");
    const c: Case = {
      id: "contract",
      name: "",
      en: "",
      tag: "",
      tagEn: "",
      price: stake,
      level: 1,
      color: "",
      pool: pool.map((s) => s.id),
    };
    return {
      stake,
      owned,
      pool,
      odds: oddsFor(c, 0.96, null),
      min: Math.min(...pool.map((s) => s.price)),
      max: Math.max(...pool.map((s) => s.price)),
    };
  }
  contract(uids: number[], extra = 0): Pending {
    this.idle();
    const q = this.contractQuote(uids, extra),
      roll = this.rng();
    if (!Number.isFinite(roll) || roll < 0 || roll >= 1) throw Error("random");
    let cumulative = 0;
    const id =
      q.pool.find((_, i) => (cumulative += q.odds[i]) > roll)?.id ??
      q.pool.at(-1)!.id;
    this.state.coins -= extra;
    this.state.inventory = this.state.inventory.filter(
      (i) => !uids.includes(i.uid),
    );
    this.state.contracts++;
    this.state.xp += CONTRACT_XP;
    return this.event("contract", this.currentCase, [id], {
      roll,
      sourceValue: q.stake,
      bonusXp: CONTRACT_XP,
      contractMin: q.min,
      contractMax: q.max,
    });
  }
  battle(
    id: CaseId,
    rounds = 3,
    sequence?: CaseId[],
    opponentId?: string,
  ): Pending {
    this.idle();
    if (![1, 2, 3, 5].includes(rounds)) throw Error("quantity");
    const cases = sequence
      ? sequence.map(caseFor)
      : Array.from({ length: rounds }, () => caseFor(id));
    if (cases.length !== rounds) throw Error("selection");
    if (cases.some((c) => c.level > this.level)) throw Error("locked");
    const cost = cases.reduce((sum, c) => sum + c.price, 0);
    if (this.state.coins < cost) throw Error("funds");
    if (this.state.inventory.length + rounds * 2 > 200) throw Error("capacity");
    const playerDrops = cases.map((c) => pick(c, this.rng())),
      botDrops = cases.map((c) => pick(c, this.rng()));
    const value = (ids: number[]) =>
      ids.reduce((a, id) => a + skin(id).price, 0);
    const win = value(playerDrops) > value(botDrops),
      tie = value(playerDrops) === value(botDrops);
    const rewards = win
      ? [...playerDrops, ...botDrops]
      : tie
        ? playerDrops
        : [];
    this.state.coins -= cost;
    this.state.battles++;
    if (win) this.state.battleWins++;
    this.state.xp += rounds * CASE_XP;
    return this.event("battle", cases[0], rewards, {
      success: win || tie,
      sourceValue: cost,
      playerDrops,
      botDrops,
      battleCases: cases.map((c) => c.id),
      opponentId: opponentFor(opponentId).id,
      bonusXp: rounds * CASE_XP,
    });
  }
}
