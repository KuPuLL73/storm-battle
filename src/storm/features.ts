import { OPPONENTS, opponentFor } from "./opponents";
import { caseArtwork } from "./case-art";
import {
  CASES,
  caseFor,
  skin,
  priceOf,
  StormGame,
  type CaseId,
} from "./engine";
export const featureUI = {
  opponentId: "volt",
  farmGoalCase: "",
  farmGoalCount: 1,
  aimX: 50,
  aimY: 50,
  contractSelected: [] as number[],
  contractExtra: 0,
  battleRounds: 3,
  battleCase: "street" as CaseId,
  caseFilter: "all",
  minPrice: 0,
  maxPrice: 0,
};
export type FeatureContext = {
  lang: "ru" | "en";
  coin: (n: number) => string;
  image: (id: number, cls?: string, lazy?: boolean) => string;
  card: (
    id: number,
    attrs?: string,
    suffix?: string,
    checked?: boolean,
  ) => string;
  asset: (p: string) => string;
  caseName: (id: CaseId) => string;
  canReward: boolean;
};
const tr = (c: FeatureContext, ru: string, en: string) =>
  c.lang === "ru" ? ru : en;
const time = (ms: number) =>
  `${Math.floor(Math.max(0, ms) / 60000)}:${String(Math.ceil(Math.max(0, ms) / 1000) % 60).padStart(2, "0")}`;
export function giftsView(g: StormGame, c: FeatureContext, now: number) {
  return `<div class="section-heading"><div><h2>${tr(c, "Твои подарки", "Your gifts")}</h2></div></div><div class="timed-gifts">${[
    0, 1, 2,
  ]
    .map((i) => {
      const id = g.giftSkin(i),
        until = g.state.giftAt[i];
      return `<article class="timed-gift" style="--rarity:${skin(id).color}"><div><span class="eyebrow">${[5, 15, 30][i]} MIN / ${["I", "II", "III"][i]}</span><h3>${tr(c, ["Разминка", "На волне", "В эпицентре"][i], ["Warm-up", "Riding the wave", "Epicentre"][i])}</h3><small>${skin(id).weapon} · ${c.lang === "ru" ? skin(id).name : skin(id).nameEn}</small>${c.coin(skin(id).price)}</div>${c.image(id)}<button class="secondary" data-gift="${i}" data-gift-until="${until}" ${until > now || !c.canReward ? "disabled" : ""}>${until > now ? time(until - now) : tr(c, "▶ Забрать за рекламу", "▶ Watch ad & claim")}</button></article>`;
    })
    .join("")}</div>`;
}
export function tasksView(g: StormGame, c: FeatureContext) {
  return `<div class="section-heading"><div><h1>${tr(c, "Задания", "Tasks")}</h1></div></div><div class="quest-grid">${g
    .tasks()
    .map(
      (q, i) =>
        `<article class="quest-card ${q.claimed ? "quest-done" : ""}"><span class="quest-number">${String(i + 1).padStart(2, "0")}</span><div><h3>${c.lang === "ru" ? q.ru : q.en}</h3><p>${q.id === "farm" ? time(Math.min(q.value, q.goal)) : Math.min(q.value, q.goal)} / ${q.id === "farm" ? "5:00" : q.goal}</p></div><progress max="${q.goal}" value="${q.value}"></progress><div class="claim-actions"><button class="${q.value >= q.goal && !q.claimed ? "primary" : "secondary"}" data-quest="${q.id}" ${q.claimed || q.value < q.goal ? "disabled" : ""}>${q.claimed ? tr(c, "Получено ✓", "Claimed ✓") : `${tr(c, "Забрать", "Claim")} ${c.coin(q.reward)}`}</button>${!q.claimed && q.value >= q.goal ? `<button class="secondary optional-reward" data-quest-ad="${q.id}" ${c.canReward ? "" : "disabled"}>${tr(c, "▶ Реклама · ×2", "▶ Ad · ×2")} ${c.coin(q.reward * 2)}</button>` : ""}</div></article>`,
    )
    .join("")}</div>`;
}
export function contractsView(g: StormGame, c: FeatureContext) {
  const u = featureUI;
  u.contractSelected = u.contractSelected.filter((id) =>
    g.state.inventory.some((x) => x.uid === id),
  );
  const items = g.state.inventory.filter((i) =>
    u.contractSelected.includes(i.uid),
  );
  let q: ReturnType<StormGame["contractQuote"]> | null = null;
  try {
    q = g.contractQuote(u.contractSelected, u.contractExtra);
  } catch {}
  return `<div class="section-heading"><div><h1>${tr(c, "Контракты", "Contracts")}</h1><p>${tr(c, "Обменивай от 3 до 10 скинов на один новый. Он может быть дешевле или дороже выбранных.", "Trade 3–10 skins for one new item. It may be worth less or more than your inputs.")}</p></div><button class="text-button" data-action="contract-clear">${tr(c, "Очистить", "Clear")}</button></div>
 <div class="contract-slots">${Array.from({ length: 10 }, (_, i) => (items[i] ? `<button data-contract-select="${items[i].uid}" class="filled" style="--rarity:${skin(items[i].skinId).color}">${c.image(items[i].skinId)}<small>${c.coin(skin(items[i].skinId).price)}</small><span>×</span></button>` : `<div class="contract-empty"><span>+</span><small>${String(i + 1).padStart(2, "0")}</small></div>`)).join("")}</div>
 <div class="contract-workspace"><section><div class="list-header"><h2>${tr(c, "Твой инвентарь", "Your inventory")}</h2><span>${items.length}/10 · ${c.coin(priceOf(items))}</span></div><div class="skin-grid selectable-grid">${g.state.inventory.map((i) => c.card(i.skinId, `data-contract-select="${i.uid}"`, "", u.contractSelected.includes(i.uid))).join("") || `<p>${tr(c, "Открой кейсы, чтобы собрать контракт.", "Open cases to build a contract.")}</p>`}</div></section><section class="contract-paper"><span class="eyebrow">STORM TRADE AGREEMENT</span><h2>${tr(c, "Результат контракта", "Contract result")}</h2><p>${tr(c, "3–10 скинов → 1 случайный. Обмен нельзя отменить.", "3–10 skins → 1 random item. Trades are final.")}</p><div class="contract-range"><small>${tr(c, "Возможная стоимость", "Possible value")}</small><strong>${q ? `${c.coin(q.min)} <span>—</span> ${c.coin(q.max)}` : "—"}</strong></div><label class="contract-extra">${tr(c, "Добавить поинты", "Add points")}<input id="contract-extra" type="range" min="0" max="${g.state.coins}" value="${u.contractExtra}"><strong>${c.coin(u.contractExtra)}</strong></label><div class="signature-area"><svg id="signature" viewBox="0 0 400 100" aria-label="${tr(c, "Поле для автографа", "Signature area")}"><path fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg><small>${tr(c, "Подпись · необязательно", "Signature · optional")}</small></div><button class="primary" data-action="contract" ${q ? "" : "disabled"}>${tr(c, "Подписать и обменять", "Sign & trade")} · ${items.length}/10</button></section></div>${q ? `<details class="contract-pool"><summary>${tr(c, "Весь возможный дроп и точные шансы", "All possible drops & exact odds")} · ${q.pool.length}</summary><div class="skin-grid contents-grid">${q.pool.map((s, i) => c.card(s.id, `data-preview="${s.id}"`, `<span class="drop-odds">${(q!.odds[i] * 100).toLocaleString(c.lang === "ru" ? "ru-RU" : "en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 })}%</span>`)).join("")}</div></details>` : ""}`;
}
export function battleLobby(g: StormGame, c: FeatureContext) {
  const u = featureUI,
    d = caseFor(u.battleCase),
    unlocked = CASES.filter((x) => x.level <= g.level),
    rival = opponentFor(u.opponentId);
  const avatar = (id: string) =>
    `<span class="opponent-avatar avatar-${opponentFor(id).id}" role="img" aria-label="${opponentFor(id).name}"></span>`;
  const presets = [
    ["street", 1],
    ["budget", 3],
    ["pistols", 2],
    ["neon", 3],
    ["redline", 5],
  ] as const;
  return `<div class="section-heading"><div><h1>${tr(c, "Лобби батлов", "Battle lobby")}</h1></div><span class="level-badge">${tr(c, "Твоя арена", "Your arena")}</span></div>
 <section class="battle-builder"><div><span class="eyebrow">${tr(c, "ТВОЙ СТОЛ", "YOUR TABLE")}</span><h2>${tr(c, "Собери свой батл", "Create your battle")}</h2></div><label>${tr(c, "Кейс", "Case")}<select id="battle-case">${unlocked.map((x) => `<option value="${x.id}" ${x.id === d.id ? "selected" : ""}>${c.caseName(x.id)} · ${x.price}</option>`).join("")}</select></label><label>${tr(c, "Раунды", "Rounds")}<select id="battle-rounds">${[1, 2, 3, 5].map((n) => `<option value="${n}" ${u.battleRounds === n ? "selected" : ""}>${n}</option>`).join("")}</select></label><button class="primary" data-action="battle">${tr(c, "Начать батл", "Start battle")} ${c.coin(d.price * u.battleRounds)}</button></section>
 <div class="battle-lineup"><div class="lineup-player"><img class="opponent-avatar player-portrait" src="${c.asset("storm/art/player.webp")}" alt="${tr(c, "Ты", "You")}"><strong>${tr(c, "Ты", "You")}</strong></div><div class="lineup-cases">${Array.from({ length: u.battleRounds }, (_, i) => `<div><img src="${c.asset(caseArtwork(d.id))}" alt="${c.caseName(d.id)}"><small>${i + 1}</small></div>`).join("")}</div><div class="lineup-player">${avatar(rival.id)}<strong>${rival.name}</strong></div></div>
 <div class="section-heading"><div><h2>${tr(c, "Выбери стол", "Choose a table")}</h2></div></div><div class="lobby-grid">${presets
   .filter(([id]) => caseFor(id).level <= g.level)
   .map(([id, n], i) => {
     const x = caseFor(id),
       r = OPPONENTS[(i + 1) % OPPONENTS.length];
     return `<article class="lobby-card"><div class="lobby-card-top"><span class="eyebrow">TABLE / ${String(i + 1).padStart(2, "0")}</span><span class="lobby-tag">${n} ${tr(c, "раунд.", "rounds")}</span></div><div class="lobby-opponent">${avatar(r.id)}<div><strong>${r.name}</strong><small>${tr(c, "Соперник стола", "Table opponent")}</small></div></div><img class="lobby-case" src="${c.asset(caseArtwork(x.id))}" alt="${c.caseName(id)}"><h3>${c.caseName(id)}</h3><div class="lobby-entry">${c.coin(x.price * n)}<button class="secondary" data-battle-preset="${id}" data-rounds="${n}" data-opponent="${r.id}">${tr(c, "Войти", "Join")} ↗</button></div></article>`;
   })
   .join(
     "",
   )}</div><details class="lobby-rules"><summary>${tr(c, "Правила арены", "Arena rules")}</summary><p>${tr(c, "Лобби — симуляция, соперниками управляет игра. У всех одинаковые таблицы дропа. Побеждает сумма стоимости за все раунды. При ничьей каждый сохраняет свой дроп.", "This lobby is a simulation with computer-controlled opponents. All use the same drop tables. The highest total value wins. Ties return each side’s own drops.")}</p></details>`;
}
