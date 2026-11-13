import "./style.css";
import "./features.css";
import "./reels.css";
import "./refresh.css";
import "./design.css";
import { aimView } from "./aim-view";
import { caseArtwork } from "./case-art";
import { settingsView } from "./settings-view";
import { chooseOrientation, type OrientationPreference } from "./orientation";
import { opponentFor } from "./opponents";
import { reelMarkup, startReels } from "./reels";
import {
  featureUI,
  giftsView,
  tasksView,
  contractsView,
  battleLobby,
  type FeatureContext,
} from "./features";
import { Platform } from "../platform";
import { AdBreakPolicy } from "./ad-policy";
import { StormAudio } from "./audio";
import {
  StormGame,
  CASES,
  SKIN_LIST,
  LEVEL_XP,
  MULTI_LEVELS,
  canOpenQuantity,
  caseFor,
  skin,
  oddsFor,
  priceOf,
  pick,
  type CaseId,
  type Pending,
  type Owned,
} from "./engine";
import { translator, type Lang, type Key } from "./i18n";

const platform = new Platform({
  local: "storm-battle.save.v1",
  cloud: "stormBattleV1",
});
const audio = new StormAudio();
let game = new StormGame(),
  lang: Lang = "ru",
  t = translator(lang);
type Route =
  | "cases"
  | "case"
  | "upgrade"
  | "inventory"
  | "bonuses"
  | "battles"
  | "contracts"
  | "tasks";
let route: Route = "cases",
  caseId: CaseId = "street",
  quantity = 1,
  targetId = 2,
  extra = 0;
let selected: number[] = [],
  inventorySelected: number[] = [],
  query = "",
  type = "all",
  sort = "newest",
  battleCase: CaseId = "street";
let animations: Animation[] = [];
let animation: Animation | undefined,
  animationDone: (() => void) | undefined,
  animating = false,
  adBusy = false,
  sdkPaused = false,
  focused = true;
let modalKind: "result" | "info" | "confirm" | null = null,
  confirmAction: (() => void) | null = null;
const root = document.querySelector<HTMLDivElement>("#app")!;
const dialog = document.querySelector<HTMLDialogElement>("#modal")!;
const toastBox = document.querySelector<HTMLDivElement>("#toast")!;
const e = (s: unknown) =>
  String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
const asset = (path: string) => import.meta.env.BASE_URL + path;
const nf = (n: number) =>
  new Intl.NumberFormat(lang === "ru" ? "ru-RU" : "en-US", {
    maximumFractionDigits: 0,
  }).format(n);
const itemCount = (n: number) => {
  if (lang === "en") return `${n} ${n === 1 ? "item" : "items"}`;
  const form = new Intl.PluralRules("ru").select(n);
  return `${n} ${form === "one" ? "предмет" : form === "few" ? "предмета" : "предметов"}`;
};
const coin = (n: number) =>
  `<span class="money"><img class="coin-mark" src="${asset("storm/art/coin.png")}" alt="" aria-hidden="true">${nf(n)}</span>`;
const name = (id: number) => (lang === "ru" ? skin(id).name : skin(id).nameEn);
const caseName = (id: CaseId) =>
  lang === "ru" ? caseFor(id).name : caseFor(id).en;
const image = (id: number, cls = "", lazy = true) =>
  `<img class="skin-image ${cls}" src="${asset(skin(id).image)}" alt="${e(skin(id).weapon + " | " + name(id))}" draggable="false" ${lazy ? 'loading="lazy"' : ""}>`;
const bolt = `<img src="${asset("storm/art/emblem.png")}" alt="" class="storm-emblem">`;
const navigationIcon = (id: string) =>
  `<img class="nav-art" src="${asset(`storm/icons/${id}.webp`)}" alt="" aria-hidden="true" draggable="false">`;
function icon(id: string) {
  if (id === "settings")
    return `<img class="settings-art" src="${asset("storm/icons/settings.webp")}" alt="" aria-hidden="true">`;
  const paths: Record<string, string> = {
    cases: "M3 8 12 3l9 5-9 5zm0 0v10l9 5 9-5V8M12 13v10",
    upgrade: "m4 13 8-8 8 8M4 21l8-8 8 8",
    inventory: "M4 7h16v14H4zM8 7V3h8v4M8 12h8",
    contracts: "M5 3h11l4 4v16H4V3zM15 3v6h5M8 13h8M8 17h6m-6 4 3-2 2 2 3-1",
    tasks: "M8 4H4v19h16V4h-4M8 2h8v5H8zM8 13l2 2 5-5M8 19h7",
    bonuses:
      "M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8M12 1v5m0 12v5M1 12h5m12 0h5",
    battles: "m4 3 6 6-4 4-4-4 2-6zm16 0-6 6 4 4 4-4-2-6zM6 13l12 9m0-9L6 22",
    back: "m15 5-7 7 7 7M8 12h13",
    sound: "M3 9h5l6-5v16l-6-5H3zM18 7c4 3 4 7 0 10",
    settings:
      "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8M12 2v3m0 14v3M2 12h3m14 0h3M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2",
    help: "M9 8a3 3 0 1 1 5 2c-2 1-2 2-2 4M12 18v1",
    close: "m6 6 12 12M18 6 6 18",
    lock: "M6 11h12v10H6zM9 11V7a3 3 0 0 1 6 0v4",
    arrow: "M5 12h14m-5-5 5 5-5 5",
  };
  return `<svg viewBox="0 0 24 26" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[id] || paths.cases}"/></svg>`;
}
const tr = (ru: string, en: string) => (lang === "ru" ? ru : en);
const context = (): FeatureContext => ({
  lang,
  coin,
  image,
  card,
  asset,
  caseName,
  canReward: platform.canReward,
});
function caseArt(id: CaseId) {
  return asset(caseArtwork(id));
}
function persist() {
  platform.save({
    bestScore:
      game.state.bestSkin === null ? 0 : skin(game.state.bestSkin).price,
    bestWave: game.level,
    wins: game.state.upgradeWins,
    sound: game.state.sound,
    music: false,
    run: game.snapshot(),
  });
}
function toast(text: string) {
  toastBox.textContent = text;
  toastBox.classList.add("visible");
  window.setTimeout(() => toastBox.classList.remove("visible"), 3600);
}
function error(err: unknown) {
  const id = err instanceof Error ? err.message : "";
  const keys: Record<string, Key> = {
    funds: "funds",
    locked: "lockedError",
    selection: "selection",
    target: "targetError",
    chance: "chanceError",
    capacity: "capacity",
    busy: "busy",
    cooldown: "cooldown",
  };
  toast(t(keys[id] ?? "missing"));
}
function remaining(until: number) {
  const seconds = Math.max(0, Math.ceil((until - platform.time()) / 1000));
  const hours = Math.floor(seconds / 3600);
  return hours
    ? `${hours}:${String(Math.floor((seconds % 3600) / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`
    : `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}
function nav(next: Route) {
  if (animating || adBusy) return;
  if (
    (next === "cases" || next === "inventory") &&
    route !== "bonuses" &&
    next !== route &&
    !game.state.pending &&
    !dialog.open &&
    platform.canInterstitial &&
    adBreaks.due(platform.time(), game.state.lastAdAt)
  ) {
    void breakAd(next);
    return;
  }
  goTo(next);
}
const adBreaks = new AdBreakPolicy(platform.time());
function goTo(next: Route) {
  route = next;
  query = "";
  type = "all";
  render();
  document.querySelector(".content")?.scrollTo(0, 0);
}
async function breakAd(next: Route, countdown = false) {
  adBusy = true;
  game.state.lastAdAt = platform.time();
  persist();
  root.classList.add("busy");
  pauseState();
  toast(tr("Рекламная пауза", "Ad break"));
  try {
    if (countdown) {
      showModal(
        `<h2>${tr("Рекламная пауза", "Ad break")}</h2><p aria-live="polite" id="ad-countdown">${tr("Реклама через", "Ad starts in")} 2</p>`,
        "info",
      );
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const label = document.querySelector("#ad-countdown");
      if (label) label.textContent = tr("Реклама через 1", "Ad starts in 1");
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    if (focused && !sdkPaused) await platform.interstitial();
  } finally {
    if (countdown) {
      dialog.close();
      modalKind = null;
    }
    game.state.lastAdAt = platform.time();
    persist();
    adBusy = false;
    root.classList.remove("busy");
    pauseState();
    goTo(next);
  }
}
function setTarget(multiplier = 2) {
  const stake =
    priceOf(game.state.inventory.filter((i) => selected.includes(i.uid))) +
    extra;
  targetId = (
    [...SKIN_LIST]
      .sort((a, b) => a.price - b.price)
      .find((s) => s.price >= stake * multiplier && s.price > stake) ??
    SKIN_LIST.at(-1)!
  ).id;
}
function card(id: number, attrs = "", suffix = "", checked = false) {
  const s = skin(id);
  return `<button class="skin-card ${checked ? "chosen" : ""}" ${attrs} style="--rarity:${s.color}"><span class="skin-wear">CS2</span>${checked ? '<span class="selected-mark">✓</span>' : ""}${image(id)}<span class="weapon-name">${e(s.weapon)}</span><strong>${e(name(id))}</strong><span class="card-bottom">${coin(s.price)}${suffix}</span></button>`;
}
function recent() {
  // The transaction is already saved, but its drops are revealed by the reels first.
  const history = game.state.pending
    ? game.state.recent.slice(game.state.pending.skinIds.length)
    : game.state.recent;
  const ids = history.length
    ? history.slice(0, 8)
    : [17, 19, 29, 28, 21, 31, 23, 32];
  return `<section class="drop-strip"><div class="strip-title"><span class="status-dot"></span>${t(history.length ? "recent" : "possible")}</div><div class="strip-items">${ids.map((id) => `<div class="strip-item" style="--rarity:${skin(id).color}">${image(id)}<span><small>${e(skin(id).weapon)}</small><strong>${e(name(id))}</strong></span></div>`).join("")}</div></section>`;
}
function header() {
  const s = game.state,
    next = LEVEL_XP[game.level] ?? s.xp,
    base = LEVEL_XP[game.level - 1],
    max = game.level === LEVEL_XP.length,
    progress = max ? 100 : (100 * (s.xp - base)) / (next - base);
  return `<header class="topbar"><div class="header-top"><button class="brand" data-nav="cases" aria-label="${t("cases")}"><span class="brand-mark">${bolt}</span><strong>${t("title")}</strong></button><div class="profile-summary"><img class="player-avatar" src="${asset("storm/art/player.webp")}" alt="${tr("Твой профиль", "Your profile")}"><div><strong>${t("level")} ${game.level}</strong><div class="level-track"><span style="width:${Math.min(100, progress)}%"></span></div><small>${max ? "MAX" : `${nf(s.xp)} / ${nf(next)} XP`}</small></div></div><div class="header-actions">${game.availableLevelRewards.length ? `<button class="reward-shortcut" data-action="level-rewards"><img src="${asset("storm/art/reward.webp")}" alt=""><span>${game.availableLevelRewards.length}</span></button>` : ""}<button class="wallet" data-nav="bonuses" aria-label="${t("balance")}">${coin(s.coins)}<span class="plus">+</span></button><button class="language" data-action="lang" aria-label="Русский / English">${lang.toUpperCase()}</button><button class="icon-button" data-action="settings" aria-label="${tr("Настройки", "Settings")}">${icon("settings")}</button></div></div><nav class="navigation" aria-label="${t("title")}">${(["cases", "upgrade", "contracts", "battles", "inventory", "bonuses", "tasks"] as const).map((id) => `<button data-nav="${id}" class="${route === id || (id === "cases" && route === "case") ? "active" : ""}">${navigationIcon(id)}<span>${t(id)}</span>${id === "inventory" ? `<b>${s.inventory.length}</b>` : ""}</button>`).join("")}</nav></header>`;
}
function levelRewardsView() {
  const levels = Array.from({ length: LEVEL_XP.length - 1 }, (_, i) => i + 2);
  return `<div class="rewards-heading"><h2>${tr("Сундуки за уровень", "Level chests")}</h2><span>${tr("Гарантированный скин", "Guaranteed skin")}</span></div><div class="level-reward-track">${levels
    .map((level) => {
      const claimed = game.state.levelRewards.includes(level),
        unlocked = game.level >= level,
        pool = game.levelRewardPool(level),
        minimum = Math.min(...pool.map((id) => skin(id).price));
      return `<article class="level-reward ${claimed ? "claimed" : unlocked ? "ready" : ""}"><span>${t("level")} ${level}</span><img src="${asset("storm/art/reward.webp")}" alt="${tr("Премиальный сундук", "Premium chest")}"><strong>${tr("Скин от", "Skin from")} ${coin(minimum)}</strong><button class="${unlocked && !claimed ? "primary" : "secondary"}" data-level-reward="${level}" ${claimed || !unlocked ? "disabled" : ""}>${claimed ? tr("Получен", "Claimed") : unlocked ? tr("Открыть", "Open") : `${nf(LEVEL_XP[level - 1])} XP`}</button></article>`;
    })
    .join("")}</div>`;
}
function caseCard(id: CaseId) {
  const c = caseFor(id),
    locked = c.level > game.level;
  return `<button class="case-card ${locked ? "locked" : ""} case-theme-${c.id}" data-case="${c.id}" style="--case-color:${c.color}"><span class="case-card-top"><span>${c.fixed ? "50 / 50" : `${c.pool.length} ${tr("скинов", "skins")}`}</span><span class="level-badge">${locked ? icon("lock") : ""}${t("level")} ${c.level}</span></span><span class="case-art"><img class="case-container" src="${caseArt(id)}" alt="${caseName(id)}" loading="lazy" draggable="false"></span><strong class="case-name">${caseName(id)}</strong><span class="case-card-footer">${coin(c.price)}<span class="case-arrow">${icon("arrow")}</span></span></button>`;
}
function casesView() {
  const filtered = CASES.filter(
    (c) =>
      featureUI.caseFilter === "all" ||
      (featureUI.caseFilter === "available"
        ? c.level <= game.level
        : featureUI.caseFilter === "risk"
          ? !!c.fixed
          : featureUI.caseFilter === "premium"
            ? c.pool.every((id) => skin(id).type !== "weapon")
            : c.level === 1),
  );
  return `<div class="catalog-hero"><section class="hero"><div class="hero-copy"><span class="eyebrow">${tr("33 КЕЙСА", "33 CASES")}</span><h1>${tr("Кейсы", "Cases")}<br><span>${tr("и скины CS", "& CS skins")}</span></h1><button class="primary" data-action="${game.state.opened === 0 ? "first-case" : "browse"}">${game.state.opened === 0 ? tr("Открыть первый кейс", "Open first case") : tr("Выбрать кейс", "Choose a case")}${icon("arrow")}</button></div></section><section class="free-feature"><div class="free-feature-art"><img src="${caseArt(game.currentCase.id)}" alt="${caseName(game.currentCase.id)}"></div><span class="eyebrow">${tr("КАЖДЫЕ 10 МИНУТ", "EVERY 10 MINUTES")}</span><h2>${tr("Бонусный кейс", "Bonus case")}</h2><button class="primary" data-action="free" data-requires-ad data-cooldown="${game.state.freeAt}" ${game.state.freeAt > platform.time() || !platform.canReward ? "disabled" : ""}>${game.state.freeAt > platform.time() ? remaining(game.state.freeAt) : t("freeOpen")}</button></section></div><section class="level-rewards-section">${levelRewardsView()}</section><div class="section-heading catalog-heading"><h2>${t("collection")}</h2><div class="catalog-filters filter-tabs">${[
    ["all", tr("Все", "All")],
    ["available", tr("Доступные", "Unlocked")],
    ["start", tr("Старт", "Starter")],
    ["risk", "50 / 50"],
    ["premium", tr("Ножи и перчатки", "Knives & gloves")],
  ]
    .map(
      ([id, label]) =>
        `<button data-case-filter="${id}" class="${featureUI.caseFilter === id ? "active" : ""}">${label}</button>`,
    )
    .join("")}</div></div>${LEVEL_XP.map((_, i) => {
    const level = i + 1,
      cases = filtered.filter((c) => c.level === level);
    if (!cases.length) return "";
    return `<section class="catalog-level ${level > game.level ? "future-level" : ""}" data-catalog-level="${level}"><div class="catalog-level-title"><h3>${t("level")} ${level}</h3><span>${level > game.level ? `${nf(LEVEL_XP[i])} XP` : tr("Доступно", "Unlocked")}${level === 3 ? " · ×2" : level === 5 ? " · ×3" : level === 8 ? " · ×5" : ""}</span></div><div class="case-grid">${cases.map((c) => caseCard(c.id)).join("")}</div></section>`;
  }).join("")}`;
}
function caseView() {
  const c = caseFor(caseId),
    locked = c.level > game.level,
    odds = oddsFor(c),
    shortfall = Math.max(0, c.price * quantity - game.state.coins);
  return `<div class="case-heading"><button class="text-button" data-nav="cases">${icon("back")}${t("back")}</button><div><h1>${caseName(c.id)}</h1><p>${lang === "ru" ? c.tag : c.tagEn}</p></div><span class="level-badge">${t("level")} ${c.level}</span></div><section class="case-stage" style="--case-color:${c.color}"><div class="stage-orbit"></div><img class="opening-case" src="${caseArt(c.id)}" alt="${e(caseName(c.id))}" draggable="false"></section><div class="opening-controls"><div class="segments" aria-label="${t("open")}">${[1, 2, 3, 5].map((q) => `<button data-quantity="${q}" class="${quantity === q ? "active" : ""}" ${canOpenQuantity(game.level, q) ? "" : "disabled"} title="${canOpenQuantity(game.level, q) ? `×${q}` : `${t("level")} ${MULTI_LEVELS[q]}`}"><span>×${q}</span>${canOpenQuantity(game.level, q) ? "" : `<small>${t("level")} ${MULTI_LEVELS[q]}</small>`}</button>`).join("")}</div><button class="primary open-button" data-action="${!locked && shortfall ? "earn-needed" : "open"}" ${locked ? "disabled" : ""}>${locked ? `${t("locked")} ${c.level}` : shortfall ? `${tr("Заработать", "Earn")} ${coin(shortfall)}` : `${t("open")} ${coin(c.price * quantity)}`}</button><button class="fast-toggle ${game.state.fast ? "active" : ""}" data-action="fast" aria-pressed="${game.state.fast}"><span class="toggle-dot"></span>${t("fast")}</button>${!locked && c.price <= 500 && quantity === 1 ? `<button class="secondary" data-ad="caseAd" title="${tr("Один выбранный кейс до 500 монет, раз в 3 минуты", "One selected case up to 500 coins, every 3 minutes")}" ${game.state.caseAdAt > platform.time() || !platform.canReward ? "disabled" : ""}>${game.state.caseAdAt > platform.time() ? remaining(game.state.caseAdAt) : tr("▶ Реклама · открыть ×1", "▶ Ad · open ×1")}</button>` : ""}</div>${!locked && shortfall ? `<div class="funds-hint">${tr("Стоимость открытия", "Opening cost")}: ${coin(c.price * quantity)} · ${tr("Не хватает", "Missing")}: ${coin(shortfall)}</div>` : ""}<div class="section-heading"><div><h2>${t("contents")}</h2></div><span class="count-label">${c.fixed ? "50% / 50% · " : ""}${c.pool.length} ${t("items")}</span></div><section class="skin-grid contents-grid">${c.pool.map((id, i) => card(id, 'data-preview="' + id + '"', `<span class="drop-odds">${(odds[i] * 100).toLocaleString(lang === "ru" ? "ru-RU" : "en-US", { maximumFractionDigits: 4, minimumFractionDigits: 2 })}%</span>`)).join("")}</section>`;
}
function getQuote() {
  try {
    return game.quote(selected, targetId, extra);
  } catch {
    return null;
  }
}
function upgradeView() {
  selected = selected.filter((uid) =>
    game.state.inventory.some((i) => i.uid === uid),
  );
  const owned = game.state.inventory.filter((i) => selected.includes(i.uid)),
    stake = priceOf(owned),
    q = getQuote();
  return `<div class="section-heading upgrade-heading"><div><span class="eyebrow">SKIN UPGRADE</span><h1>${t("upgrade")}</h1><p>${t("upgradeHint")}</p></div></div><section class="upgrade-stage"><div class="upgrade-slot source-slot"><span class="eyebrow">${t("choose")}</span><div class="upgrade-input-slots">${Array.from({ length: 6 }, (_, i) => (owned[i] ? `<button data-select="${owned[i].uid}" aria-label="${tr("Убрать предмет", "Remove item")}">${image(owned[i].skinId)}<span>×</span></button>` : `<span>+</span>`)).join("")}</div><div class="source-art">${owned.length ? owned.map((i) => image(i.skinId, "selected-skin", false)).join("") : `<img class="empty-illustration" src="${asset("storm/art/inventory.webp")}" alt="">`}</div><div><strong>${owned.length ? `${itemCount(owned.length)}` : t("chooseText")}</strong><span class="slot-price">${coin(stake + extra)}</span></div><button class="secondary slot-picker" data-action="pick-source">${tr("Выбрать скины", "Choose skins")}</button></div><div class="upgrade-center"><div class="upgrade-ring" style="--chance:${(q?.chance ?? 0) * 100}%"><div class="dial-ticks"></div><div class="ring-inner"><strong id="chance-value">${((q?.chance ?? 0) * 100).toLocaleString(lang === "ru" ? "ru-RU" : "en-US", { maximumFractionDigits: 2, minimumFractionDigits: 1 })}<small>%</small></strong><span>${t("chance")}</span></div><div class="upgrade-needle"></div></div><button class="primary" id="upgrade-start" data-action="upgrade" ${q ? "" : "disabled"}>${t("startUpgrade")}${icon("arrow")}</button></div><div class="upgrade-slot target-slot" style="--rarity:${skin(targetId).color}"><span class="eyebrow">${t("target")}</span>${image(targetId, "target-art", false)}<div><small>${e(skin(targetId).weapon)}</small><strong>${e(name(targetId))}</strong><span class="slot-price">${coin(skin(targetId).price)}</span></div><button class="secondary slot-picker" data-action="pick-target">${tr("Выбрать цель", "Choose target")}</button></div></section><div class="upgrade-adjustments"><label>${t("addCoins")} <strong id="extra-value">${nf(extra)}</strong><input id="extra" type="range" min="0" max="${Math.max(0, Math.min(game.state.coins, skin(targetId).price - stake - 1))}" step="1" value="${extra}" aria-label="${t("addCoins")}"></label><div class="segments">${[2, 5, 10].map((x) => `<button data-multiplier="${x}">×${x}</button>`).join("")}</div><div class="chance-shortcuts">${[30, 50, 75].map((n) => `<button data-chance="${n}">${n}%</button>`).join("")}</div><p>${t("upgradeRisk")}</p></div><div class="upgrade-lists"><section><div class="list-header"><h2>${t("inventory")} <span>${game.state.inventory.length}</span></h2><small>${t("chooseText")}</small></div><div class="skin-grid selectable-grid">${game.state.inventory.length ? game.state.inventory.map((i) => card(i.skinId, `data-select="${i.uid}"`, "", selected.includes(i.uid))).join("") : `<div class="empty-state"><p>${t("upgradeEmpty")}</p><button class="secondary" data-nav="cases">${t("cases")}</button></div>`}</div></section><section><div class="list-header"><h2>${t("target")}</h2><input id="skin-search" type="search" value="${e(query)}" placeholder="${t("search")}" aria-label="${t("search")}"></div><div class="filter-tabs">${(["all", "weapons", "knives", "gloves"] as const).map((id) => `<button data-type="${id}" class="${type === id ? "active" : ""}">${t(id)}</button>`).join("")}</div><div class="price-filters"><label>${tr("Цена от", "Min price")}<input id="min-price" type="number" min="0" value="${featureUI.minPrice || ""}" placeholder="0"></label><label>${tr("до", "Max price")}<input id="max-price" type="number" min="0" value="${featureUI.maxPrice || ""}" placeholder="∞"></label></div><div id="target-list" class="skin-grid selectable-grid">${targetCards()}</div></section></div>`;
}
function targetCards() {
  const minimum =
    priceOf(game.state.inventory.filter((i) => selected.includes(i.uid))) +
    extra;
  const items = SKIN_LIST.filter(
    (s) =>
      s.price > minimum &&
      s.price >= featureUI.minPrice &&
      (!featureUI.maxPrice || s.price <= featureUI.maxPrice) &&
      (!query ||
        (s.weapon + " " + s.name + " " + s.nameEn)
          .toLowerCase()
          .includes(query.toLowerCase())) &&
      (type === "all" ||
        (type === "weapons"
          ? s.type === "weapon"
          : type === "knives"
            ? s.type === "knife"
            : s.type === "gloves")),
  );
  return items.length
    ? items
        .sort((a, b) => a.price - b.price)
        .map((s) => card(s.id, `data-target="${s.id}"`, "", targetId === s.id))
        .join("")
    : `<p>${t("noMatches")}</p>`;
}
function inventoryView() {
  inventorySelected = inventorySelected.filter((uid) =>
    game.state.inventory.some((i) => i.uid === uid),
  );
  let items = [...game.state.inventory];
  if (sort === "expensive")
    items.sort((a, b) => skin(b.skinId).price - skin(a.skinId).price);
  else if (sort === "cheapest")
    items.sort((a, b) => skin(a.skinId).price - skin(b.skinId).price);
  else items.reverse();
  return `<div class="section-heading"><div><span class="eyebrow">YOUR COLLECTION</span><h1>${t("inventory")} <span class="title-count">${items.length}</span></h1><p>${t("value")}: ${coin(game.inventoryValue)}</p></div><div class="inventory-tools"><select id="sort" aria-label="${t("inventory")}">${(["newest", "expensive", "cheapest"] as const).map((x) => `<option value="${x}" ${sort === x ? "selected" : ""}>${t(x)}</option>`).join("")}</select><button class="secondary" data-action="sell-all" ${items.length ? "" : "disabled"}>${t("sellAll")}</button></div></div>${items.length ? `<section class="skin-grid inventory-grid">${items.map((i) => `<article class="inventory-item ${inventorySelected.includes(i.uid) ? "is-selected" : ""}">${card(i.skinId, `data-inventory-select="${i.uid}"`, "", inventorySelected.includes(i.uid))}<div class="item-actions"><button data-sell="${i.uid}">${t("sell")}</button><button data-to-upgrade="${i.uid}" aria-label="${t("goUpgrade")}">${icon("upgrade")}</button></div></article>`).join("")}</section>` : `<div class="empty-state large"><img class="empty-illustration" src="${asset("storm/art/inventory.webp")}" alt=""><h2>${t("empty")}</h2><p>${t("emptyText")}</p><button class="primary" data-nav="cases">${t("cases")}</button></div>`}${inventorySelected.length ? `<div class="selection-bar"><span>${t("selected")}: ${inventorySelected.length} · ${coin(priceOf(game.state.inventory.filter((i) => inventorySelected.includes(i.uid))))}</span><button class="secondary" data-action="upgrade-selected">${t("goUpgrade")}</button><button class="primary" data-action="sell-selected">${t("sell")}</button></div>` : ""}<section class="records"><h2>${t("stats")}</h2><div><span>${t("opened")}<strong>${game.state.opened}</strong></span><span>${t("upgradesWon")}<strong>${game.state.upgradeWins}</strong></span><span>${t("best")}<strong>${game.state.bestSkin === null ? "—" : e(skin(game.state.bestSkin).weapon + " | " + name(game.state.bestSkin))}</strong></span></div></section>`;
}
function bonusView() {
  const now = platform.time(),
    c = game.currentCase;
  return (
    aimView(game, context(), featureUI, now) +
    giftsView(game, context(), now) +
    `<div class="section-heading"><h2>${tr("Бонусные открытия", "Bonus openings")}</h2></div><div class="legacy-bonuses"><div class="bonus-cards"><section class="bonus-card free-card"><img src="${caseArt(c.id)}" alt="${caseName(c.id)}"><div><span class="eyebrow">10 MIN</span><h2>${t("freeTitle")}</h2><p>${t("freeText")}</p><button class="primary" data-action="free" data-requires-ad data-cooldown="${game.state.freeAt}" ${game.state.freeAt > now || !platform.canReward ? "disabled" : ""}>${game.state.freeAt > now ? remaining(game.state.freeAt) : t("freeOpen")}</button></div></section><section class="bonus-card"><img class="bonus-illustration" src="${asset("storm/art/daily.webp")}" alt=""><div><h2>${t("daily")}</h2><p>${t("dailyText")}</p><div class="claim-actions"><button class="secondary" data-action="daily" data-cooldown="${game.state.dailyAt}" ${game.state.dailyAt > now ? "disabled" : ""}>${game.state.dailyAt > now ? remaining(game.state.dailyAt) : `${t("claim")} ${coin(c.price)}`}</button><button class="secondary optional-reward" data-ad="daily" ${game.state.dailyAt > now || !platform.canReward ? "disabled" : ""}>${tr("▶ Реклама · ×2", "▶ Ad · ×2")} ${coin(c.price * 2)}</button></div></div></section><section class="bonus-card"><img class="bonus-illustration" src="${asset("storm/art/wheel.webp")}" alt=""><div><h2>${t("wheel")}</h2><p>${t("wheelText")}</p><button class="secondary" data-action="wheel" data-cooldown="${game.state.wheelAt}" ${game.state.wheelAt > now ? "disabled" : ""}>${game.state.wheelAt > now ? remaining(game.state.wheelAt) : t("spin")}</button></div></section><section class="bonus-card"><img class="bonus-illustration" src="${asset("storm/art/ticket.webp")}" alt=""><div><h2>${t("ticket")} <span class="title-count">${game.state.tickets}</span></h2><p>${t("ticketText")}</p><div class="bonus-buttons"><button class="secondary" data-ad="ticket" ${platform.canReward ? "" : "disabled"}>${t("watch")}</button>${game.state.tickets ? `<button class="primary" data-action="ticket">${t("useTicket")}</button>` : ""}</div></div></section>${!platform.canReward ? `<p class="subtle ad-note">${t("adUnavailable")}</p>` : ""}</div></div>`
  );
}
function battleView() {
  return battleLobby(game, context());
}
function render() {
  audio.enabled = game.state.sound;
  document.documentElement.lang = lang;
  document.title = t("title");
  root.innerHTML = `${header()}<main class="content"><div class="content-inner">${route === "cases" ? casesView() : route === "case" ? caseView() : route === "upgrade" ? upgradeView() : route === "inventory" ? inventoryView() : route === "bonuses" ? bonusView() : route === "contracts" ? contractsView(game, context()) : route === "tasks" ? tasksView(game, context()) : battleView()}</div></main><footer class="app-footer"><span><span class="status-dot"></span>${t("saved")}</span><button data-action="help">${t("help")} ↗</button></footer>`;
}
function showModal(content: string, kind: "result" | "info" | "confirm") {
  modalKind = kind;
  dialog.innerHTML = content;
  if (!dialog.open) dialog.showModal();
}
function closeModal() {
  if (modalKind === "result" && game.state.pending) {
    game.dismiss();
    persist();
  }
  dialog.close();
  modalKind = null;
  confirmAction = null;
  render();
}
function sourcePicker() {
  showModal(
    `<button class="modal-close icon-button" data-action="close" aria-label="${t("close")}">${icon("close")}</button><h2>${tr("Скины для апгрейда", "Upgrade inputs")}</h2><p>${tr("Выбери до 6 предметов", "Choose up to 6 items")} · ${selected.length}/6</p><div class="skin-grid picker-grid">${game.state.inventory.map((i) => card(i.skinId, `data-modal-source="${i.uid}"`, "", selected.includes(i.uid))).join("") || t("empty")}</div><button class="primary picker-done" data-action="close">${tr("Готово", "Done")}</button>`,
    "info",
  );
}
function targetPicker() {
  query = "";
  type = "all";
  featureUI.minPrice = 0;
  featureUI.maxPrice = 0;
  showModal(
    `<button class="modal-close icon-button" data-action="close" aria-label="${t("close")}">${icon("close")}</button><h2>${t("target")}</h2><input id="modal-target-search" type="search" placeholder="${t("search")}" aria-label="${t("search")}"><div id="modal-target-list" class="skin-grid picker-grid">${targetCards()}</div>`,
    "info",
  );
}
function confirmSell(ids: number[]) {
  showModal(
    `<button class="modal-close icon-button" data-action="close" aria-label="${t("close")}">${icon("close")}</button><h2>${t("confirmSell")}</h2><p>${itemCount(ids.length)} · ${coin(priceOf(game.state.inventory.filter((i) => ids.includes(i.uid))))}</p><div class="modal-actions"><button class="secondary" data-action="close">${t("cancel")}</button><button class="primary" data-action="confirm">${t("sell")}</button></div>`,
    "confirm",
  );
  confirmAction = () => {
    const amount = game.sell(ids);
    persist();
    dialog.close();
    modalKind = null;
    inventorySelected = [];
    render();
    audio.coin();
    toast(`${t("sold")} ${nf(amount)}`);
  };
}
function resultView(playSound = true) {
  const p = game.state.pending;
  if (!p) return;
  const items = p.skinIds;
  let heading: string = t("drop");
  let body = "",
    footer = "";
  if (p.kind === "levelReward")
    heading = `${tr("Сундук за уровень", "Level chest")} ${p.rewardLevel}`;
  if (p.kind === "upgrade") {
    heading = t(p.success ? "upgradeWin" : "upgradeLose");
    body = !p.success
      ? `<div class="result-failed"><img class="empty-illustration" src="${asset("storm/art/upgrade.webp")}" alt=""></div><p>${t("upgradeLoseText")}</p>`
      : "";
  }
  if (p.kind === "wheel") {
    heading = t("bonusReceived");
    body = `<div class="wheel-result">${p.bonusCoins ? coin(p.bonusCoins) : p.bonusXp ? `+${p.bonusXp} XP` : t("ticket")}</div>`;
  }
  if (p.kind === "battle") {
    const value = (ids: number[]) =>
        ids.reduce((a, id) => a + skin(id).price, 0),
      pv = value(p.playerDrops!),
      bv = value(p.botDrops!);
    heading = t(pv === bv ? "tie" : p.success ? "battleWin" : "battleLose");
    body = `<div class="battle-results"><section><h3>${t("you")} ${coin(pv)}</h3>${p.playerDrops!.map((id) => `<div class="battle-result-item">${image(id)}<span>${e(skin(id).weapon)}<strong>${e(name(id))}</strong></span>${coin(skin(id).price)}</div>`).join("")}</section><section><h3>${opponentFor(p.opponentId).name} ${coin(bv)}</h3>${p.botDrops!.map((id) => `<div class="battle-result-item">${image(id)}<span>${e(skin(id).weapon)}<strong>${e(name(id))}</strong></span>${coin(skin(id).price)}</div>`).join("")}</section></div>`;
  } else if (items.length)
    body += `<div class="result-items ${items.length === 1 ? "single-result" : ""}">${items.map((id) => `<div class="result-skin" style="--rarity:${skin(id).color}">${p.newSkinIds?.includes(id) ? `<span class="new-drop">${tr("Новый", "New")}</span>` : ""}${image(id, "", false)}<small>${e(skin(id).weapon)}</small><h3>${e(name(id))}</h3>${coin(skin(id).price)}</div>`).join("")}</div>`;
  if (items.length)
    footer = `<button class="secondary" data-result="keep">${t("keep")}</button><button class="primary" data-result="sell">${t("sell")} ${coin(items.reduce((v, id) => v + skin(id).price, 0))}</button><button class="ad-sell" data-result="ad-sale" ${platform.canReward ? "" : "disabled"}>${t("sellBonus")} · +50%</button>`;
  else
    footer = `<button class="primary" data-result="keep">${t("continue")}</button>`;
  const recovery = game.recoveryQuote(platform.time());
  const wheelBonus = game.wheelBonusQuote();
  if (recovery)
    footer += `<button class="secondary optional-reward" data-ad="recovery" ${platform.canReward ? "" : "disabled"}>${tr("▶ Реклама · вернуть", "▶ Ad · recover")} ${coin(recovery)}</button>`;
  if (wheelBonus)
    footer += `<button class="secondary optional-reward" data-ad="wheelBonus" ${platform.canReward ? "" : "disabled"}>${wheelBonus.coins ? `${tr("▶ Реклама · ещё", "▶ Ad · extra")} ${coin(wheelBonus.coins)}` : tr("▶ Реклама · ещё 1 билет", "▶ Ad · 1 extra ticket")}</button>`;
  const unlocks = CASES.filter(
    (c) => c.level > (p.previousLevel ?? game.level) && c.level <= game.level,
  );
  const levelNotice = unlocks.length
    ? `<div class="level-unlock"><span>${bolt}</span><div><strong>${tr("Новый уровень", "Level up")} ${game.level}</strong><p>${tr("Премиальный сундук готов", "Premium chest ready")}${[3, 5, 8].includes(game.level) ? ` · ×${game.level === 3 ? 2 : game.level === 5 ? 3 : 5}` : ""}</p></div><button class="text-button" data-result="catalog">${tr("Посмотреть", "View")}</button></div>`
    : "";
  const totalValue = items.reduce((v, id) => v + skin(id).price, 0);
  const shortcuts =
    p.kind === "case"
      ? `<div class="result-shortcuts"><button class="text-button" data-result="repeat" ${canOpenQuantity(game.level, items.length) && game.state.coins >= caseFor(p.caseId).price * items.length ? "" : "disabled"}>${tr("Открыть ещё", "Open again")} ${coin(caseFor(p.caseId).price * items.length)}</button><button class="text-button" data-result="sell-repeat" ${canOpenQuantity(game.level, items.length) && game.state.coins + totalValue >= caseFor(p.caseId).price * items.length ? "" : "disabled"}>${tr("Продать и открыть", "Sell & open")}</button><button class="text-button" data-result="farm">${tr("Заработать поинты", "Earn points")} ↗</button></div>`
      : "";
  showModal(
    `<span class="result-eyebrow">${p.kind === "case" ? caseName(p.caseId) : p.kind === "levelReward" ? tr("Награда", "Reward") : t(p.kind === "battle" ? "battles" : p.kind === "contract" ? "contracts" : p.kind === "wheel" ? "wheel" : "upgrade")}</span><h2>${heading}</h2>${p.newBest && items.length ? `<p class="personal-best">✦ ${tr("Личный рекорд дропа", "Personal best drop")}</p>` : ""}${body}${levelNotice}<div class="result-bonuses">${p.bonusXp ? `<span>+${p.bonusXp} XP</span>` : ""}${p.bonusCoins && p.kind !== "wheel" ? `<span>${t("milestone")} +${nf(p.bonusCoins)}</span>` : ""}</div><div class="modal-actions">${footer}</div>${shortcuts}`,
    "result",
  );
  if (playSound) p.success ? audio.win() : audio.lose();
}
function pauseState() {
  const paused = sdkPaused || !focused || document.hidden || adBusy;
  if (paused) {
    game.missAim();
    refreshAim();
  }
  audio.setActive(!paused);
  for (const motion of animations) {
    if (paused) motion.pause();
    else if (motion.playState === "paused") motion.play();
  }
  if (paused) platform.gameplayStop();
  else platform.gameplayStart();
}
function playAnimations(motions: Animation[], done: () => void) {
  animating = true;
  root.classList.add("busy");
  animations = motions;
  animation = motions[0];
  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    for (const motion of motions) motion.cancel();
    animations = [];
    animation = undefined;
    animationDone = undefined;
    animating = false;
    root.classList.remove("busy");
    done();
  };
  animationDone = finish;
  Promise.all(motions.map((a) => a.finished))
    .then(finish)
    .catch(() => {});
  pauseState();
}
function animate(
  element: Element,
  keyframes: Keyframe[],
  options: KeyframeAnimationOptions,
  done: () => void,
) {
  playAnimations([element.animate(keyframes, options)], done);
}
const reelContext = () => ({ image, name, escape: e });
function playOpening(p: Pending) {
  render();
  const stage = document.querySelector(".case-stage");
  if (!stage) {
    resultView();
    return;
  }
  stage.classList.add("spinning", "multi-opening");
  stage.innerHTML =
    reelMarkup(
      p.skinIds.map((id, i) => ({
        caseId: p.caseId,
        skinId: id,
        label:
          p.skinIds.length > 1
            ? `${tr("Кейс", "Case")} ${i + 1} / ${p.skinIds.length}`
            : caseName(p.caseId),
      })),
      reelContext(),
    ) +
    `<button class="secondary batch-skip" data-action="skip">${t("skip")}</button>`;
  stage.scrollIntoView({ block: "nearest", behavior: "instant" });
  const motions = startReels(stage, game.state.fast ? 600 : 3800);
  let last = 0;
  const ticks = setInterval(() => {
    if (
      animation?.playState === "running" &&
      Number(animation.currentTime) - last > 90
    ) {
      audio.tick();
      last = Number(animation.currentTime);
    }
  }, 100);
  playAnimations(motions, () => {
    clearInterval(ticks);
    render();
    resultView();
  });
}
function beginCase(mode: "paid" | "ticket" = "paid") {
  try {
    const p = game.open(
      mode === "paid" ? caseId : game.currentCase.id,
      mode === "paid" ? quantity : 1,
      mode,
      platform.time(),
    );
    caseId = p.caseId;
    route = "case";
    persist();
    playOpening(p);
  } catch (err) {
    error(err);
  }
}
function beginUpgrade() {
  try {
    const p = game.upgrade(selected, targetId, extra);
    persist();
    const needle = document.querySelector(".upgrade-needle")!;
    animate(
      needle,
      [
        { transform: "rotate(0deg)" },
        { transform: `rotate(${1440 + p.roll * 360}deg)` },
      ],
      {
        duration: game.state.fast ? 550 : 3300,
        easing: "cubic-bezier(.16,.65,.16,1)",
        fill: "forwards",
      },
      () => {
        selected = [];
        extra = 0;
        render();
        resultView();
      },
    );
  } catch (err) {
    error(err);
  }
}
function beginWheel() {
  try {
    game.wheel(platform.time());
    persist();
    showModal(
      `<h2>${t("wheel")}</h2><div class="bonus-wheel-stage"><span class="wheel-pointer"></span><div class="bonus-wheel">${[0, 1, 2, 3, 4, 5, 6, 7].map((i) => `<span style="--i:${i}">${i < 4 ? nf(Math.round(game.currentCase.price * [0.2, 0.4, 0.6, 1][i])) : i < 6 ? `${i === 4 ? 10 : 20} XP` : `<img src="${asset("storm/art/ticket.webp")}" alt="${t("ticket")}">`}</span>`).join("")}</div></div>`,
      "info",
    );
    const p = game.state.pending!;
    animate(
      dialog.querySelector(".bonus-wheel")!,
      [
        { transform: "rotate(0deg)" },
        { transform: `rotate(${1800 - ((p.wheelIndex ?? 0) + 0.5) * 45}deg)` },
      ],
      {
        duration: game.state.fast ? 600 : 3200,
        easing: "cubic-bezier(.15,.7,.12,1)",
        fill: "forwards",
      },
      () => resultView(),
    );
  } catch (err) {
    error(err);
  }
}
async function ad(
  type:
    | "ticket"
    | "boost"
    | "sale"
    | "coins"
    | "free"
    | "gift"
    | "daily"
    | "quest"
    | "caseAd"
    | "recovery"
    | "wheelBonus",
  uids: number[] = [],
  giftIndex = -1,
  questId = "",
) {
  if (adBusy || animating) return;
  if (!platform.canReward) {
    toast(t("adUnavailable"));
    return;
  }
  const resultId = game.state.pending?.id;
  const requestedCase = caseId;
  if (
    type === "caseAd" &&
    (game.state.pending ||
      quantity !== 1 ||
      caseFor(requestedCase).level > game.level ||
      caseFor(requestedCase).price > 500 ||
      game.state.caseAdAt > platform.time() ||
      game.state.inventory.length >= 200)
  ) {
    toast(t("cooldown"));
    return;
  }
  if (type === "recovery" && !game.recoveryQuote(platform.time())) {
    toast(t("cooldown"));
    return;
  }
  if (type === "wheelBonus" && !game.wheelBonusQuote()) {
    toast(t("cooldown"));
    return;
  }
  if (
    type === "daily" &&
    (game.state.pending || game.state.dailyAt > platform.time())
  ) {
    toast(t("cooldown"));
    return;
  }
  if (type === "quest") {
    const task = game.tasks().find((q) => q.id === questId);
    if (game.state.pending || !task || task.claimed || task.value < task.goal) {
      toast(t("cooldown"));
      return;
    }
  }
  if (
    type === "free" &&
    (game.state.pending ||
      game.state.freeAt > platform.time() ||
      game.state.inventory.length >= 200)
  ) {
    toast(t(game.state.inventory.length >= 200 ? "capacity" : "cooldown"));
    return;
  }
  let freeOpening: Pending | undefined;
  if (
    type === "gift" &&
    (game.state.pending ||
      !Number.isInteger(giftIndex) ||
      giftIndex < 0 ||
      giftIndex > 2 ||
      game.state.giftAt[giftIndex] > platform.time() ||
      game.state.inventory.length >= 200)
  ) {
    toast(t(game.state.inventory.length >= 200 ? "capacity" : "cooldown"));
    return;
  }
  adBusy = true;
  game.state.lastAdAt = platform.time();
  persist();
  root.classList.add("busy");
  dialog.classList.add("ad-pending");
  pauseState();
  try {
    const success = await platform.rewarded();
    if (!success) {
      toast(t("adFailed"));
      return;
    }
    const receipt = `${type}-${platform.time()}-${game.state.nextEvent++}`;
    if (type === "sale") {
      const amount = game.sell(uids, receipt);
      toast(`${t("sold")} ${nf(amount)}`);
    } else if (type === "free") {
      freeOpening = game.open(
        game.currentCase.id,
        1,
        "free",
        platform.time(),
        receipt,
      );
      caseId = freeOpening.caseId;
      route = "case";
    } else if (type === "caseAd") {
      freeOpening = game.open(
        requestedCase,
        1,
        "caseAd",
        platform.time(),
        receipt,
      );
      caseId = requestedCase;
      route = "case";
    } else if (type === "recovery") {
      const amount = game.recoverLoss(resultId!, platform.time(), receipt);
      toast(`+${nf(amount)} ${t("coins")}`);
    } else if (type === "wheelBonus") {
      game.boostWheel(resultId!, receipt);
      toast(t("bonusReceived"));
    } else if (type === "gift") {
      const id = game.gift(giftIndex, platform.time(), receipt);
      toast(tr("Подарок в инвентаре: ", "Gift added: ") + name(id));
    } else if (type === "daily" || type === "quest") {
      const amount =
        type === "daily"
          ? game.daily(platform.time(), receipt)
          : game.claimTask(questId, receipt);
      toast(`+${nf(amount)} ${t("coins")}`);
    } else {
      game.adBonus(type, receipt, platform.time());
      toast(t("bonusReceived"));
    }
    persist();
    audio.coin();
  } catch (err) {
    error(err);
  } finally {
    game.state.lastAdAt = platform.time();
    persist();
    adBusy = false;
    root.classList.remove("busy");
    dialog.classList.remove("ad-pending");
    pauseState();
    render();
    if (modalKind === "result" && game.state.pending) resultView(false);
  }
  if (freeOpening) playOpening(freeOpening);
}
async function finishResult(action: string) {
  const p = game.state.pending;
  if (!p) return;
  const repeat = action === "repeat" || action === "sell-repeat",
    cost = caseFor(p.caseId).price * p.skinIds.length;
  if (repeat) {
    const available =
      game.state.coins +
      (action === "sell-repeat"
        ? p.skinIds.reduce((v, id) => v + skin(id).price, 0)
        : 0);
    if (available < cost) {
      toast(t("funds"));
      return;
    }
  }
  const uids = [...p.uids];
  game.dismiss();
  dialog.close();
  modalKind = null;
  if (action === "sell" || action === "sell-repeat") {
    try {
      const amount = game.sell(uids);
      audio.coin();
      if (!repeat) toast(`${t("sold")} ${nf(amount)}`);
    } catch (err) {
      error(err);
      persist();
      render();
      return;
    }
  }
  persist();
  if (
    action !== "ad-sale" &&
    platform.canInterstitial &&
    adBreaks.due(platform.time(), game.state.lastAdAt)
  ) {
    await breakAd(route);
  }
  if (repeat) {
    caseId = p.caseId;
    quantity = p.skinIds.length;
    beginCase();
    return;
  }
  if (action === "catalog") {
    featureUI.caseFilter = "available";
    nav("cases");
    return;
  }
  if (action === "farm") {
    featureUI.farmGoalCase = p.caseId;
    featureUI.farmGoalCount = p.skinIds.length;
    nav("bonuses");
    return;
  }
  render();
  if (action === "ad-sale") void ad("sale", uids);
}

document.addEventListener("click", (ev) => {
  const button = (ev.target as Element).closest<HTMLElement>(
    "button,[data-preview]",
  );
  if (!button || button.hasAttribute("disabled")) return;
  if (adBusy) return;
  if (animating) {
    if (button.dataset.action === "skip") animationDone?.();
    return;
  }
  audio.unlock();
  audio.click();
  const d = button.dataset;
  try {
    if (d.caseFilter) {
      featureUI.caseFilter = d.caseFilter;
      render();
      return;
    }
    if (d.aimUpgrade) {
      game.aimUpgrade(d.aimUpgrade as "reward" | "target" | "combo");
      persist();
      render();
      return;
    }
    if (d.orientation) {
      void setOrientation(d.orientation as OrientationPreference);
      return;
    }
    if (d.setting) {
      if (d.setting === "sound") game.state.sound = !game.state.sound;
      if (d.setting === "fast") game.state.fast = !game.state.fast;
      if (d.setting === "language") changeLanguage();
      persist();
      render();
      openSettings();
      return;
    }
    if (d.modalSource) {
      const uid = Number(d.modalSource);
      selected = selected.includes(uid)
        ? selected.filter((x) => x !== uid)
        : selected.length < 6
          ? [...selected, uid]
          : selected;
      extra = 0;
      setTarget();
      render();
      sourcePicker();
      return;
    }
    if (d.contractSelect) {
      const uid = Number(d.contractSelect),
        a = featureUI.contractSelected;
      featureUI.contractSelected = a.includes(uid)
        ? a.filter((x) => x !== uid)
        : a.length < 10
          ? [...a, uid]
          : a;
      render();
      return;
    }
    if (d.gift) {
      void ad("gift", [], Number(d.gift));
      return;
    }
    if (d.questAd) {
      void ad("quest", [], -1, d.questAd);
      return;
    }
    if (d.quest) {
      const n = game.claimTask(d.quest);
      persist();
      render();
      toast("+" + nf(n));
      return;
    }
    if (d.chance) {
      const stake =
        priceOf(game.state.inventory.filter((i) => selected.includes(i.uid))) +
        extra;
      targetId =
        [...SKIN_LIST]
          .filter((x) => x.price > stake)
          .sort(
            (a, b) =>
              Math.abs((0.95 * stake) / a.price - Number(d.chance) / 100) -
              Math.abs((0.95 * stake) / b.price - Number(d.chance) / 100),
          )[0]?.id ?? targetId;
      render();
      return;
    }
    if (d.battlePreset) {
      featureUI.battleCase = d.battlePreset;
      featureUI.battleRounds = Number(d.rounds);
      featureUI.opponentId = opponentFor(d.opponent).id;
      nav("battles");
      beginBattle();
      return;
    }
    if (d.levelReward) {
      game.claimLevelReward(Number(d.levelReward));
      persist();
      render();
      resultView();
      return;
    }
    if (d.action === "level-rewards") {
      showModal(
        `<button class="modal-close icon-button" data-action="close" aria-label="${t("close")}">${icon("close")}</button>${levelRewardsView()}`,
        "info",
      );
      return;
    }
    if (d.nav) {
      nav(d.nav as Route);
      return;
    }
    if (d.case) {
      caseId = d.case as CaseId;
      quantity = 1;
      nav("case");
      return;
    }
    if (d.quantity) {
      if (!canOpenQuantity(game.level, Number(d.quantity))) return;
      quantity = Number(d.quantity);
      render();
      return;
    }
    if (d.select) {
      const uid = Number(d.select);
      if (selected.includes(uid)) selected = selected.filter((x) => x !== uid);
      else if (selected.length < 6) selected.push(uid);
      else {
        toast(t("selection"));
        return;
      }
      extra = 0;
      setTarget();
      render();
      return;
    }
    if (d.target) {
      if (dialog.open) {
        dialog.close();
        modalKind = null;
      }
      targetId = Number(d.target);
      extra = 0;
      render();
      return;
    }
    if (d.multiplier) {
      setTarget(Number(d.multiplier));
      extra = 0;
      render();
      return;
    }
    if (d.type) {
      type = d.type;
      render();
      return;
    }
    if (d.inventorySelect) {
      const uid = Number(d.inventorySelect);
      inventorySelected = inventorySelected.includes(uid)
        ? inventorySelected.filter((x) => x !== uid)
        : [...inventorySelected, uid];
      render();
      return;
    }
    if (d.sell) {
      confirmSell([Number(d.sell)]);
      return;
    }
    if (d.toUpgrade) {
      selected = [Number(d.toUpgrade)];
      extra = 0;
      setTarget();
      nav("upgrade");
      return;
    }
    if (d.result) {
      finishResult(d.result);
      return;
    }
    if (d.ad) {
      void ad(
        d.ad as
          | "ticket"
          | "boost"
          | "coins"
          | "daily"
          | "caseAd"
          | "recovery"
          | "wheelBonus",
      );
      return;
    }
    if (d.battleCase) {
      battleCase = d.battleCase as CaseId;
      render();
      return;
    }
    if (d.preview) {
      const id = Number(d.preview);
      showModal(
        `<button class="modal-close icon-button" data-action="close" aria-label="${t("close")}">${icon("close")}</button><div class="result-items single-result"><div class="result-skin" style="--rarity:${skin(id).color}">${image(id, "", false)}<small>${e(skin(id).weapon)}</small><h2>${e(name(id))}</h2>${coin(skin(id).price)}</div></div>`,
        "info",
      );
      return;
    }
    switch (d.action) {
      case "first-case":
        caseId = "street";
        quantity = 1;
        if (game.state.coins >= 50) beginCase();
        else {
          featureUI.farmGoalCase = "street";
          featureUI.farmGoalCount = 1;
          nav("bonuses");
        }
        break;
      case "earn-needed":
        featureUI.farmGoalCase = caseId;
        featureUI.farmGoalCount = quantity;
        nav("bonuses");
        break;
      case "return-case":
        caseId = featureUI.farmGoalCase;
        quantity = featureUI.farmGoalCount;
        featureUI.farmGoalCase = "";
        nav("case");
        break;
      case "pick-source":
        sourcePicker();
        break;
      case "pick-target":
        targetPicker();
        break;
      case "aim": {
        if (
          route !== "bonuses" ||
          !focused ||
          sdkPaused ||
          document.hidden ||
          dialog.open
        )
          break;
        const n = game.aim(platform.time());
        if (n) {
          const arena = button.closest<HTMLElement>(".aim-arena")!;
          const r = arena.getBoundingClientRect(),
            size = game.aimTargetSize;
          const marginX = Math.min(40, ((size / 2 + 12) / r.width) * 100);
          const marginY = Math.min(40, ((size / 2 + 48) / r.height) * 100);
          featureUI.aimX = marginX + Math.random() * (100 - marginX * 2);
          featureUI.aimY = marginY + Math.random() * (100 - marginY * 2);
          aimDeadline = platform.time() + game.aimComboWindow;
          button.style.left = featureUI.aimX + "%";
          button.style.top = featureUI.aimY + "%";
          const hits = document.querySelector("[data-aim-hits]");
          if (hits) hits.textContent = String(game.state.aimHits);
          refreshWallet();
          audio.coin();
          persist();
        }
        break;
      }
      case "contract-clear":
        featureUI.contractSelected = [];
        featureUI.contractExtra = 0;
        render();
        break;
      case "contract": {
        game.contract(featureUI.contractSelected, featureUI.contractExtra);
        persist();
        featureUI.contractSelected = [];
        featureUI.contractExtra = 0;
        const panel = document.querySelector(".contract-paper")!;
        animate(
          panel,
          [
            { filter: "brightness(1)" },
            { filter: "brightness(1.8)" },
            { filter: "brightness(1)" },
          ],
          { duration: game.state.fast ? 300 : 1000 },
          () => {
            render();
            resultView();
          },
        );
        break;
      }
      case "browse":
        document
          .querySelector(".case-grid")
          ?.scrollIntoView({ block: "start", behavior: "smooth" });
        break;
      case "open":
        beginCase();
        break;
      case "free":
        void ad("free");
        break;
      case "ticket":
        beginCase("ticket");
        break;
      case "fast":
        game.state.fast = !game.state.fast;
        persist();
        render();
        break;
      case "upgrade":
        beginUpgrade();
        break;
      case "sound":
        game.state.sound = !game.state.sound;
        persist();
        render();
        break;
      case "lang":
        changeLanguage();
        persist();
        render();
        break;
      case "settings":
        openSettings();
        break;
      case "fullscreen":
        void enterFullscreen().catch(() =>
          toast(tr("Полный экран недоступен", "Fullscreen unavailable")),
        );
        break;
      case "help":
        showModal(
          `<button class="modal-close icon-button" data-action="close" aria-label="${t("close")}">${icon("close")}</button><h2>${t("help")}</h2><p class="help-copy">${t("helpText")}</p><button class="primary" data-action="close">${t("continue")}</button>`,
          "info",
        );
        break;
      case "close":
        closeModal();
        break;
      case "confirm":
        confirmAction?.();
        break;
      case "sell-all":
        confirmSell(game.state.inventory.map((i) => i.uid));
        break;
      case "sell-selected":
        confirmSell(inventorySelected);
        break;
      case "upgrade-selected":
        if (inventorySelected.length > 6) toast(t("selection"));
        else {
          selected = [...inventorySelected];
          extra = 0;
          setTarget();
          nav("upgrade");
        }
        break;
      case "daily": {
        const n = game.daily(platform.time());
        persist();
        render();
        audio.coin();
        toast(`+${nf(n)} ${t("coins")}`);
        break;
      }
      case "wheel":
        beginWheel();
        break;
      case "battle":
        beginBattle();
        break;
    }
  } catch (err) {
    error(err);
  }
});
document.addEventListener("input", (ev) => {
  const input = ev.target as HTMLInputElement;
  if (input.id === "contract-extra") {
    featureUI.contractExtra = Number(input.value);
    return;
  }
  if (input.id === "min-price" || input.id === "max-price") {
    if (input.id === "min-price") featureUI.minPrice = Number(input.value);
    else featureUI.maxPrice = Number(input.value);
    document.querySelector("#target-list")!.innerHTML = targetCards();
    return;
  }
  if (input.id === "modal-target-search") {
    query = input.value;
    document.querySelector("#modal-target-list")!.innerHTML = targetCards();
    return;
  }
  if (input.id === "skin-search") {
    query = input.value;
    document.querySelector("#target-list")!.innerHTML = targetCards();
  }
  if (input.id === "extra") {
    extra = Number(input.value);
    const q = getQuote();
    document.querySelector("#extra-value")!.textContent = nf(extra);
    document.querySelector("#chance-value")!.innerHTML =
      `${((q?.chance ?? 0) * 100).toLocaleString(lang === "ru" ? "ru-RU" : "en-US", { maximumFractionDigits: 2, minimumFractionDigits: 1 })}<small>%</small>`;
    (document.querySelector(".upgrade-ring") as HTMLElement).style.setProperty(
      "--chance",
      `${(q?.chance ?? 0) * 100}%`,
    );
    (document.querySelector("#upgrade-start") as HTMLButtonElement).disabled =
      !q;
    document.querySelector(".source-slot .slot-price")!.innerHTML = coin(
      priceOf(game.state.inventory.filter((i) => selected.includes(i.uid))) +
        extra,
    );
  }
});
document.addEventListener("change", (ev) => {
  const input = ev.target as HTMLSelectElement;
  if (input.id === "contract-extra") {
    render();
    return;
  }
  if (input.id === "battle-case") {
    featureUI.battleCase = input.value;
    render();
    return;
  }
  if (input.id === "battle-rounds") {
    featureUI.battleRounds = Number(input.value);
    render();
    return;
  }
  if (input.id === "sort") {
    sort = input.value;
    render();
  }
});
dialog.addEventListener("cancel", (ev) => {
  ev.preventDefault();
  if (!animating && !adBusy) closeModal();
});
document.addEventListener("contextmenu", (ev) => ev.preventDefault());
document.addEventListener("visibilitychange", () => {
  focused = !document.hidden && document.hasFocus();
  pauseState();
});
window.addEventListener("blur", () => {
  focused = false;
  pauseState();
});
window.addEventListener("focus", () => {
  focused = true;
  pauseState();
});
window.addEventListener("pagehide", () => persist());
platform.onPause = () => {
  sdkPaused = true;
  pauseState();
};
platform.onResume = () => {
  sdkPaused = false;
  pauseState();
};
setInterval(() => {
  if (
    route === "bonuses" &&
    focused &&
    !sdkPaused &&
    !animating &&
    !adBusy &&
    !dialog.open &&
    !game.state.pending &&
    platform.canInterstitial &&
    adBreaks.due(platform.time(), game.state.lastAdAt)
  ) {
    void breakAd(route, true);
  }
  for (const el of document.querySelectorAll<HTMLButtonElement>(
    "[data-cooldown]",
  )) {
    const until = Number(el.dataset.cooldown);
    if (until > platform.time()) {
      el.textContent = remaining(until);
      el.disabled = true;
    } else {
      el.disabled = el.hasAttribute("data-requires-ad") && !platform.canReward;
      el.textContent = t(
        el.dataset.action === "wheel"
          ? "spin"
          : el.dataset.action === "daily"
            ? "claim"
            : "freeOpen",
      );
    }
  }
  const dailyAd =
    document.querySelector<HTMLButtonElement>('[data-ad="daily"]');
  if (dailyAd)
    dailyAd.disabled =
      game.state.dailyAt > platform.time() || !platform.canReward || adBusy;
  const caseAd =
    document.querySelector<HTMLButtonElement>('[data-ad="caseAd"]');
  if (caseAd) {
    caseAd.disabled =
      game.state.caseAdAt > platform.time() || !platform.canReward || adBusy;
    caseAd.textContent =
      game.state.caseAdAt > platform.time()
        ? remaining(game.state.caseAdAt)
        : tr("▶ Реклама · открыть ×1", "▶ Ad · open ×1");
  }
}, 1000);
let aimDeadline = 0;
function refreshAim() {
  const values: Record<string, string> = {
    "aim-value": coin(game.aimReward(platform.time())),
    "aim-multiplier": "×" + game.aimMultiplier.toFixed(2),
    "aim-streak": String(game.state.aimStreak),
    "best-streak": String(game.state.aimBestStreak),
    "aim-income": coin(game.state.aimIncome),
    "aim-hits": String(game.state.aimHits),
    "aim-boost":
      game.state.boostUntil > platform.time()
        ? `×2 · ${remaining(game.state.boostUntil)}`
        : "",
  };
  for (const [id, value] of Object.entries(values)) {
    const el = document.querySelector(`[data-${id}]`);
    if (el) el.innerHTML = value;
  }
  const meter =
    document.querySelector<HTMLProgressElement>("[data-streak-time]");
  if (meter) {
    meter.max = game.aimComboWindow;
    meter.value = game.state.aimStreak
      ? Math.max(0, aimDeadline - platform.time())
      : 0;
  }
  for (const button of document.querySelectorAll<HTMLButtonElement>(
    "[data-aim-upgrade]",
  )) {
    const q = game.aimUpgradeQuote(
      button.dataset.aimUpgrade as "reward" | "target" | "combo",
    );
    button.disabled = q.level >= q.max || q.locked || game.state.coins < q.cost;
  }
}
function changeLanguage() {
  lang = lang === "ru" ? "en" : "ru";
  game.state.language = lang;
  t = translator(lang);
}
function openSettings(result = "") {
  showModal(settingsView(game, lang, result), "info");
}
async function enterFullscreen() {
  await platform.fullscreen();
}
async function setOrientation(preference: OrientationPreference) {
  game.state.orientation = preference;
  persist();
  const result = await chooseOrientation(preference, enterFullscreen);
  if (dialog.open && dialog.querySelector("[data-orientation]"))
    openSettings(result);
}
function refreshWallet() {
  refreshAim();
  if (featureUI.farmGoalCase) {
    const cost =
        caseFor(featureUI.farmGoalCase).price * featureUI.farmGoalCount,
      missing = Math.max(0, cost - game.state.coins);
    const progress =
      document.querySelector<HTMLProgressElement>("[data-farm-goal]");
    if (progress) progress.value = game.state.coins;
    const label = document.querySelector("[data-goal-missing]");
    if (label)
      label.textContent = missing
        ? `${tr("Осталось", "Remaining")}: ${nf(missing)}`
        : tr("Можно открывать!", "Ready to open!");
    const button = document.querySelector<HTMLButtonElement>(
      '[data-action="return-case"]',
    );
    if (button) button.disabled = missing > 0;
  }

  const el = document.querySelector(".wallet .money");
  if (el)
    el.innerHTML = coin(game.state.coins).replace(
      /^<span class="money">|<\/span>$/g,
      "",
    );
}
let signaturePointer: number | null = null,
  signaturePath = "";
document.addEventListener("pointerdown", (ev) => {
  const target = ev.target as Element;
  if (
    route === "bonuses" &&
    target.closest(".aim-arena") &&
    !target.closest(".aim-target") &&
    focused &&
    !sdkPaused &&
    !adBusy &&
    !dialog.open
  ) {
    game.missAim();
    refreshAim();
    persist();
  }
  const el = target.closest<HTMLElement>("#signature");
  if (!el || adBusy || animating || ev.button !== 0) return;
  signaturePointer = ev.pointerId;
  signaturePath = "";
  el.setPointerCapture(ev.pointerId);
});
document.addEventListener("pointermove", (ev) => {
  if (signaturePointer !== ev.pointerId) return;
  const el = document.querySelector<SVGSVGElement>("#signature");
  if (!el) return;
  const r = el.getBoundingClientRect(),
    x = ((ev.clientX - r.left) / r.width) * 400,
    y = ((ev.clientY - r.top) / r.height) * 100;
  signaturePath +=
    (signaturePath ? " L" : "M") + x.toFixed(1) + "," + y.toFixed(1);
  el.querySelector("path")?.setAttribute("d", signaturePath);
});
for (const kind of ["pointerup", "pointercancel", "lostpointercapture"])
  document.addEventListener(kind, () => {
    signaturePointer = null;
  });
let farmLast = Date.now(),
  farmSave = 0;
setInterval(() => {
  const at = Date.now(),
    elapsed = Math.min(1000, at - farmLast);
  farmLast = at;
  if (
    route === "bonuses" &&
    !document.hidden &&
    focused &&
    !sdkPaused &&
    !adBusy &&
    !animating &&
    !dialog.open
  ) {
    game.farmTick(elapsed);
    game.expireAim(platform.time());
    if (at - farmSave > 5000) {
      persist();
      farmSave = at;
    }
  }
  refreshAim();
  for (const button of document.querySelectorAll<HTMLButtonElement>(
    "[data-gift-until]",
  )) {
    const until = Number(button.dataset.giftUntil);
    button.disabled = until > platform.time() || !platform.canReward || adBusy;
    button.textContent =
      until > platform.time()
        ? remaining(until)
        : tr("▶ Забрать за рекламу", "▶ Watch ad & claim");
  }
}, 500);
function beginBattle() {
  game.missAim();
  const p = game.battle(
    featureUI.battleCase,
    featureUI.battleRounds,
    undefined,
    featureUI.opponentId,
  );
  persist();
  let round = 0;
  const player = p.playerDrops!,
    bot = p.botDrops!,
    roundCases = p.battleCases ?? player.map(() => p.caseId);
  const total = (ids: number[], n: number) =>
    ids.slice(0, n).reduce((v, id) => v + skin(id).price, 0);
  const showRound = () => {
    if (round >= player.length) {
      render();
      resultView();
      return;
    }
    const pv = total(player, round),
      bv = total(bot, round);
    showModal(
      `<span class="eyebrow">STORM ARENA / ${opponentFor(p.opponentId).name}</span><h2>${tr("Раунд", "Round")} ${round + 1} / ${player.length}</h2><p>${caseName(roundCases[round])}</p><div class="battle-score"><span class="${pv > bv ? "leading" : ""}">${tr("Ты", "You")} ${coin(pv)}</span><span class="${bv > pv ? "leading" : ""}">${opponentFor(p.opponentId).name} ${coin(bv)}</span></div><div class="battle-history">${Array.from({ length: player.length }, (_, i) => `<span class="${i === round ? "current" : i < round ? "finished" : ""}">${i < round ? `${i + 1} · ${nf(skin(player[i]).price)} : ${nf(skin(bot[i]).price)}` : String(i + 1)}</span>`).join("")}</div><div class="battle-reveal">${reelMarkup(
        [
          {
            caseId: roundCases[round],
            skinId: player[round],
            label: tr("Твой дроп", "Your drop"),
          },
          {
            caseId: roundCases[round],
            skinId: bot[round],
            label: opponentFor(p.opponentId).name,
          },
        ],
        reelContext(),
        true,
      )}</div><button class="secondary battle-skip" data-action="skip">${tr("Ускорить раунд", "Skip round")}</button>`,
      "info",
    );
    const motions = startReels(dialog, game.state.fast ? 450 : 2100);
    playAnimations(motions, () => {
      audio.tick();
      round++;
      showRound();
    });
  };
  showRound();
}
async function boot() {
  try {
    const info = await platform.init();
    lang = info.lang;
    t = translator(lang);
    game = new StormGame(platform.load().run);
    if (game.state.language !== "auto") {
      lang = game.state.language;
      t = translator(lang);
    }
    persist();
    audio.enabled = game.state.sound;
    render();
    await Promise.allSettled(
      [
        ...document.querySelectorAll<HTMLImageElement>(
          ".hero-case,.free-feature-art img",
        ),
      ].map((img) => img.decode()),
    );
    document.querySelector("#loading")?.remove();
    platform.ready();
    pauseState();
    if (game.state.pending) resultView();
  } catch {
    root.innerHTML = `<div class="boot-error"><h1>Шторм батл</h1><p>Не удалось загрузить платформу. / Could not load the platform.</p><button id="retry-boot" class="primary">Повторить / Retry</button></div>`;
    document.querySelector("#loading")?.remove();
    document
      .querySelector("#retry-boot")
      ?.addEventListener("click", () => void boot());
  }
}
void boot();
