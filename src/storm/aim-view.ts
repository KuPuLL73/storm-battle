import { caseFor, StormGame } from "./engine";
import type { FeatureContext } from "./features";
type AimUI = {
  farmGoalCase: string;
  farmGoalCount: number;
  aimX: number;
  aimY: number;
};
export function aimView(
  g: StormGame,
  c: FeatureContext,
  ui: AimUI,
  now: number,
) {
  const tr = (ru: string, en: string) => (c.lang === "ru" ? ru : en),
    s = g.state;
  const goal = ui.farmGoalCase ? caseFor(ui.farmGoalCase) : null,
    cost = goal ? goal.price * ui.farmGoalCount : 0;
  const upgrades = [
    {
      id: "reward" as const,
      title: tr("Награда", "Bounty"),
      icon: "ϟ",
      text: tr(
        "Больше монет за каждое попадание.",
        "More coins for every hit.",
      ),
      value: `${c.coin(g.aimBaseReward)} → ${c.coin(g.aimBaseRewardAt(s.farmLevel + 1))}`,
    },
    {
      id: "target" as const,
      title: tr("Размер мишени", "Target size"),
      icon: "◎",
      text: tr(
        "Крупнее мишень — легче попасть.",
        "A bigger target is easier to hit.",
      ),
      value: `${g.aimTargetSize} → ${g.aimTargetSize + 5}`,
    },
    {
      id: "combo" as const,
      title: tr("Серия точности", "Accuracy streak"),
      icon: "✦",
      text: tr(
        "Выше множитель и больше времени между попаданиями.",
        "A higher multiplier and a longer window between hits.",
      ),
      value: `×${g.aimMaxMultiplier.toFixed(2)} → ×${g.aimMaxMultiplierAt(s.aimComboLevel + 1).toFixed(2)}`,
    },
  ];
  return `<div class="section-heading"><div><span class="eyebrow">STORM AIM / TRAINING RANGE</span><h1>${tr("Аимка", "Aim trainer")}</h1></div><button class="secondary" data-nav="tasks">${tr("Задания", "Tasks")} <b>${g.tasks().filter((q) => !q.claimed && q.value >= q.goal).length}</b></button></div>
 ${goal ? `<div class="farm-goal"><div><span class="eyebrow">${tr("НА СЛЕДУЮЩИЙ КЕЙС", "YOUR NEXT CASE")}</span><h3>${c.caseName(goal.id)} ×${ui.farmGoalCount}</h3><span data-goal-missing>${s.coins < cost ? `${tr("Осталось", "Remaining")}: ${cost - s.coins}` : tr("Можно открывать!", "Ready to open!")}</span></div><progress data-farm-goal max="${cost}" value="${s.coins}"></progress><button class="primary" data-action="return-case" ${s.coins < cost ? "disabled" : ""}>${tr("К открытию", "Back to opening")} ↗</button></div>` : ""}
 <div class="aim-workspace"><section class="aim-training"><div class="aim-dashboard"><div><span>${tr("За попадание", "Per hit")}</span><strong data-aim-value>${c.coin(g.aimReward(now))}</strong></div><div><span>${tr("Множитель серии", "Streak multiplier")}</span><strong data-aim-multiplier>×${g.aimMultiplier.toFixed(2)}</strong></div><div><span>${tr("Лучшая серия", "Best streak")}</span><strong data-best-streak>${s.aimBestStreak}</strong></div><div><span>${tr("Заработано в тире", "Range earnings")}</span><strong data-aim-income>${c.coin(s.aimIncome)}</strong></div></div>
 <div class="aim-arena" style="background-image:linear-gradient(#08111d35,#08111d70),url('${c.asset("storm/art/aim.png")}')"><span class="arena-label">${tr("Промах сбрасывает серию", "Misses reset the streak")}</span><button class="aim-target" data-action="aim" style="left:${ui.aimX}%;top:${ui.aimY}%;width:${g.aimTargetSize}px;height:${g.aimTargetSize}px" aria-label="${tr("Мишень", "Target")}"><span></span>+</button><div class="aim-streak-meter"><span>${tr("Серия", "Streak")}: <b data-aim-streak>${s.aimStreak}</b></span><progress max="${g.aimComboWindow}" value="0" data-streak-time></progress></div><span class="arena-counter">${tr("Попаданий", "Hits")}: <b data-aim-hits>${s.aimHits}</b></span></div>
 <div class="aim-session-footer"><span>${tr("Каждые 5 попаданий подряд повышают множитель.", "Every 5 consecutive hits increase the multiplier.")}</span><button class="secondary" data-ad="boost" ${c.canReward ? "" : "disabled"}>▶ ${tr("Удвоить доход на минуту", "Double income for 1 minute")}</button><small data-aim-boost>${s.boostUntil > now ? `×2 · ${Math.ceil((s.boostUntil - now) / 1000)}s` : ""}</small></div></section>
 <aside class="aim-shop"><div class="aim-shop-title"><span class="eyebrow">RANGE WORKSHOP</span><h2>${tr("Прокачка тира", "Range upgrades")}</h2></div>${upgrades
   .map((u) => {
     const q = g.aimUpgradeQuote(u.id),
       max = q.level >= q.max;
     return `<article class="aim-upgrade-card"><div class="aim-upgrade-title"><img src="${c.asset(`storm/art/${u.id === "reward" ? "daily" : u.id === "target" ? "emblem" : "upgrade"}.${u.id === "target" ? "png" : "webp"}`)}" alt=""><h3>${u.title}</h3><b>${q.level}/${q.max}</b></div><strong class="upgrade-preview">${max ? tr("Максимальный уровень", "Max level") : u.value}</strong>${!max && q.locked ? `<small class="aim-unlock">${tr("Следующее улучшение с уровня", "Next upgrade at level")} ${q.unlockLevel}</small>` : ""}<button class="secondary" data-aim-upgrade="${u.id}" ${max || q.locked || s.coins < q.cost ? "disabled" : ""}>${max ? tr("Прокачано", "Maxed") : tr("Улучшить", "Upgrade")} ${max ? "" : c.coin(q.cost)}</button></article>`;
   })
   .join("")}</aside></div>
 <section class="aim-extra-points"><div><span class="eyebrow">EXTRA ENERGY</span><h2>${tr("Бонусные монеты", "Bonus coins")}</h2></div><strong>${c.coin(g.adCoins)}</strong><button class="primary" data-ad="coins" ${c.canReward ? "" : "disabled"}>▶ ${tr("Смотреть рекламу", "Watch ad")}</button></section>`;
}
