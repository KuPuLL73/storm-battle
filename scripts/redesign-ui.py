from pathlib import Path
import re
root = Path(__file__).resolve().parent.parent
p = root/'src/storm/main.ts'
s = p.read_text(encoding='utf-8')
s = s.replace('import "./refresh.css";', 'import "./refresh.css";\nimport "./design.css";')
s = s.replace('  LEVEL_XP,', '  LEVEL_XP,\n  MULTI_LEVELS,\n  canOpenQuantity,')
s = s.replace('const bolt =\n  \'<svg viewBox="0 0 32 40" fill="currentColor" aria-hidden="true"><path d="M19 0 2 23h12l-2 17 19-25H18z"/></svg>\';', 'const bolt = `<img src="${asset("storm/art/emblem.png")}" alt="" class="storm-emblem">`;')
start=s.index('function header() {')
end=s.index('function caseCard(',start)
s=s[:start]+'''function header() {
  const s = game.state, next = LEVEL_XP[game.level] ?? s.xp,
    base = LEVEL_XP[game.level - 1],
    max = game.level === LEVEL_XP.length,
    progress = max ? 100 : 100 * (s.xp - base) / (next - base);
  return `<header class="topbar"><div class="header-top"><button class="brand" data-nav="cases" aria-label="${t("cases")}"><span class="brand-mark">${bolt}</span><strong>${t("title")}</strong></button><div class="profile-summary"><img class="player-avatar" src="${asset("storm/art/player.webp")}" alt="${tr("Твой профиль", "Your profile")}"><div><strong>${t("level")} ${game.level}</strong><div class="level-track"><span style="width:${Math.min(100, progress)}%"></span></div><small>${max ? "MAX" : `${nf(s.xp)} / ${nf(next)} XP`}</small></div></div><div class="header-actions">${game.availableLevelRewards.length ? `<button class="reward-shortcut" data-action="level-rewards"><img src="${asset("storm/art/reward.webp")}" alt=""><span>${game.availableLevelRewards.length}</span></button>` : ""}<button class="wallet" data-nav="bonuses" aria-label="${t("balance")}">${coin(s.coins)}<span class="plus">+</span></button><button class="language" data-action="lang" aria-label="Русский / English">${lang.toUpperCase()}</button><button class="icon-button" data-action="settings" aria-label="${tr("Настройки", "Settings")}">${icon("settings")}</button></div></div><nav class="navigation" aria-label="${t("title")}">${(["cases", "upgrade", "contracts", "battles", "inventory", "bonuses", "tasks"] as const).map((id) => `<button data-nav="${id}" class="${route === id || (id === "cases" && route === "case") ? "active" : ""}">${icon(id)}<span>${t(id)}</span>${id === "inventory" ? `<b>${s.inventory.length}</b>` : ""}</button>`).join("")}</nav></header>`;
}
function levelRewardsView() {
  const levels = Array.from({ length: LEVEL_XP.length - 1 }, (_, i) => i + 2);
  return `<div class="rewards-heading"><h2>${tr("Сундуки за уровень", "Level chests")}</h2><span>${tr("Гарантированный скин", "Guaranteed skin")}</span></div><div class="level-reward-track">${levels.map((level) => {
    const claimed = game.state.levelRewards.includes(level), unlocked = game.level >= level,
      pool = game.levelRewardPool(level), minimum = Math.min(...pool.map((id) => skin(id).price));
    return `<article class="level-reward ${claimed ? "claimed" : unlocked ? "ready" : ""}"><span>${t("level")} ${level}</span><img src="${asset("storm/art/reward.webp")}" alt="${tr("Премиальный сундук", "Premium chest")}"><strong>${tr("Скин от", "Skin from")} ${coin(minimum)}</strong><button class="${unlocked && !claimed ? "primary" : "secondary"}" data-level-reward="${level}" ${claimed || !unlocked ? "disabled" : ""}>${claimed ? tr("Получен", "Claimed") : unlocked ? tr("Открыть", "Open") : `${nf(LEVEL_XP[level - 1])} XP`}</button></article>`;
  }).join("")}</div>`;
}
''' +s[end:]
# Replace crowded weapon collages by the generated container itself, keep actual contents below.
s=s.replace('<span class="case-drop-preview">${drops.map((id, i) => `<span class="preview-drop drop-${i}" style="--rarity:${skin(id).color}">${image(id)}${c.fixed ? "<b>50%</b>" : ""}</span>`).join("")}</span>', '')
s=s.replace('<span class="case-tag">${lang === "ru" ? c.tag : c.tagEn}</span>', '')
start=s.index('  const ordered =',s.index('function caseCard('))
end=s.index('  return ',start)
s=s[:start]+s[end:]
start=s.index('function casesView() {')
end=s.index('function caseView() {',start)
s=s[:start]+'''function casesView() {
  const filtered = CASES.filter((c) => featureUI.caseFilter === "all" ||
    (featureUI.caseFilter === "available" ? c.level <= game.level :
     featureUI.caseFilter === "risk" ? !!c.fixed :
     featureUI.caseFilter === "premium" ? c.pool.every((id) => skin(id).type !== "weapon") : c.level === 1));
  return `<div class="catalog-hero"><section class="hero"><div class="hero-copy"><span class="eyebrow">${tr("КОЛЛЕКЦИЯ / 33 КЕЙСА", "COLLECTION / 33 CASES")}</span><h1>${tr("Твой следующий", "Your next")}<br><span>${tr("редкий дроп", "rare drop")}</span></h1><button class="primary" data-action="${game.state.opened === 0 ? "first-case" : "browse"}">${tr("Выбрать кейс", "Choose a case")}${icon("arrow")}</button></div></section><section class="free-feature"><div class="free-feature-art"><img src="${caseArt(game.currentCase.id)}" alt="${caseName(game.currentCase.id)}"></div><span class="eyebrow">${tr("КАЖДЫЕ 10 МИНУТ", "EVERY 10 MINUTES")}</span><h2>${tr("Бонусный кейс", "Bonus case")}</h2><button class="primary" data-action="free" data-requires-ad data-cooldown="${game.state.freeAt}" ${game.state.freeAt > platform.time() || !platform.canReward ? "disabled" : ""}>${game.state.freeAt > platform.time() ? remaining(game.state.freeAt) : t("freeOpen")}</button></section></div><section class="level-rewards-section">${levelRewardsView()}</section><div class="section-heading catalog-heading"><h2>${t("collection")}</h2><div class="catalog-filters filter-tabs">${[
    ["all", tr("Все", "All")], ["available", tr("Доступные", "Unlocked")],
    ["start", tr("Старт", "Starter")], ["risk", "50 / 50"], ["premium", tr("Ножи и перчатки", "Knives & gloves")],
  ].map(([id, label]) => `<button data-case-filter="${id}" class="${featureUI.caseFilter === id ? "active" : ""}">${label}</button>`).join("")}</div></div>${LEVEL_XP.map((_, i) => {
    const level = i + 1, cases = filtered.filter((c) => c.level === level);
    if (!cases.length) return "";
    return `<section class="catalog-level ${level > game.level ? "future-level" : ""}" data-catalog-level="${level}"><div class="catalog-level-title"><h3>${t("level")} ${level}</h3><span>${level > game.level ? `${nf(LEVEL_XP[i])} XP` : tr("Доступно", "Unlocked")}${level === 3 ? " · ×2" : level === 5 ? " · ×3" : level === 8 ? " · ×5" : ""}</span></div><div class="case-grid">${cases.map((c) => caseCard(c.id)).join("")}</div></section>`;
  }).join("")}`;
}
''' +s[end:]
s=s.replace('[1, 3, 5].map((q) => `<button data-quantity="${q}" class="${quantity === q ? "active" : ""}">×${q}</button>`)', '[1, 2, 3, 5].map((q) => `<button data-quantity="${q}" class="${quantity === q ? "active" : ""}" ${canOpenQuantity(game.level, q) ? "" : "disabled"} title="${canOpenQuantity(game.level, q) ? `×${q}` : `${t("level")} ${MULTI_LEVELS[q]}`}"><span>×${q}</span>${canOpenQuantity(game.level, q) ? "" : `<small>${t("level")} ${MULTI_LEVELS[q]}</small>`}</button>`)')
s=s.replace('<span class="stage-name">${c.id.toUpperCase()} / CASE</span>', '')
s=s.replace('<p>${t("contentsText")}</p>', '')
s=s.replace('<span>${tr("Аимка доступна без рекламы.", "The aim trainer works without ads.")}</span>', '')
s=s.replace('document.title = `${t("title")} — ${t("subtitle").toLowerCase()}`;', 'document.title = t("title");')
s=s.replace('${header()}${recent()}', '${header()}')
s=s.replace('<span class="footer-brand">STORM / 01</span>', '')
s=s.replace('if (d.quantity) {\n      quantity', 'if (d.quantity) {\n      if (!canOpenQuantity(game.level, Number(d.quantity))) return;\n      quantity')
# Reward events share the existing persisted result transaction and sale actions.
s=s.replace('  if (p.kind === "upgrade") {', '  if (p.kind === "levelReward") heading = `${tr("Сундук за уровень", "Level chest")} ${p.rewardLevel}`;\n  if (p.kind === "upgrade") {')
s=s.replace('<small>${tr("Без лимита бонуса", "No bonus cap")}</small>', '')
s=s.replace('tr("В коллекцию впервые", "New to your collection")', 'tr("Новый", "New")')
s=s.replace('<p>${tr("Открыты кейсы", "Cases unlocked")}: ${unlocks.map((c) => caseName(c.id)).join(" · ")}</p>', '<p>${tr("Премиальный сундук готов", "Premium chest ready")}${[3, 5, 8].includes(game.level) ? ` · ×${game.level === 3 ? 2 : game.level === 5 ? 3 : 5}` : ""}</p>')
s=s.replace('    if (d.nav) {', '''    if (d.levelReward) {
      game.claimLevelReward(Number(d.levelReward));
      persist();
      render();
      resultView();
      return;
    }
    if (d.action === "level-rewards") {
      showModal(`<button class="modal-close icon-button" data-action="close" aria-label="${t("close")}">${icon("close")}</button>${levelRewardsView()}`, "info");
      return;
    }
    if (d.nav) {''')
# Replace decorative generic illustrations with authored assets.
s=s.replace('<div class="bonus-symbol">${icon("bonuses")}</div>', '<img class="bonus-illustration" src="${asset("storm/art/daily.webp")}" alt="">')
s=s.replace('<div class="mini-wheel"></div>', '<img class="bonus-illustration" src="${asset("storm/art/wheel.webp")}" alt="">')
s=s.replace('<div class="bonus-symbol ticket-symbol">${icon("cases")}</div>', '<img class="bonus-illustration" src="${asset("storm/art/ticket.webp")}" alt="">')
s=s.replace('<span class="empty-slot">${icon("inventory")}</span>', '<img class="empty-illustration" src="${asset("storm/art/inventory.webp")}" alt="">')
s=s.replace('<div class="result-failed">${icon("upgrade")}</div>', '<div class="result-failed"><img class="empty-illustration" src="${asset("storm/art/upgrade.webp")}" alt=""></div>')
s=s.replace('<div class="empty-state large">${icon("inventory")}', '<div class="empty-state large"><img class="empty-illustration" src="${asset("storm/art/inventory.webp")}" alt="">')
p.write_text(s,encoding='utf-8')
# Remove decorative editorial prose, keep action instructions and consequences.
p=root/'src/storm/features.ts';s=p.read_text(encoding='utf-8')
s=re.sub(r'<p>\$\{tr\(c, "(?:Забирай скин и возвращайся|Первые цели коллекционера|Выбирай стол\.|Короткая дуэль)[^\n]*?\)\}</p>', '', s)
s=s.replace('Новая история твоего дропа', 'Результат контракта').replace('A new chapter for your drops','Contract result')
s=s.replace('Выбранные предметы исчезнут. Взамен ты получишь один случайный скин из показанного списка.', '3–10 скинов → 1 случайный. Обмен нельзя отменить.')
s=s.replace('Your selected items will be consumed. You receive one random skin from the displayed pool.', '3–10 skins → 1 random item. Trades are final.')
s=s.replace('Оставь автограф, если хочется · на шанс не влияет', 'Подпись · необязательно').replace('Leave a signature if you like · does not affect odds', 'Signature · optional')
s=re.sub(r'<p class="subtle">\$\{tr\(c, "Результат фиксируется[^\n]*?\)\}</p>', '', s)
s=s.replace('${avatar("volt")}', '<img class="opponent-avatar player-portrait" src="${c.asset("storm/art/player.webp")}" alt="${tr(c, "Ты", "You")}">')
p.write_text(s,encoding='utf-8')
p=root/'src/storm/aim-view.ts';s=p.read_text(encoding='utf-8')
s=s.replace('<p>${tr("Лови мишень, собирай серии и прокачивай свой тир.", "Hit targets, build streaks and upgrade your range.")}</p>', '')
s=s.replace('<p>${u.text}</p>', '')
s=s.replace('Только точные попадания. Промах сбрасывает серию.', 'Промах сбрасывает серию').replace('Only hits pay. A miss resets the streak.', 'Misses reset the streak')
s=s.replace('Ещё поинтов на прокачку','Бонусные монеты').replace('More points for upgrades','Bonus coins')
s=s.replace('<p>${tr("Посмотри рекламу и получи дополнительную награду.", "Watch an ad for an extra reward.")}</p>', '')
# Functional upgrade icons now use the same generated illustration family.
s=s.replace('<span>${u.icon}</span>', '<img src="${c.asset(`storm/art/${u.id === "reward" ? "daily" : u.id === "target" ? "emblem" : "upgrade"}.${u.id === "target" ? "png" : "webp"}`)}" alt="">')
p.write_text(s,encoding='utf-8')
