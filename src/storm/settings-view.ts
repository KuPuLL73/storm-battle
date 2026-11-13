import type { StormGame } from "./engine";
import type { Lang } from "./i18n";
export function settingsView(g: StormGame, lang: Lang, result = "") {
  const tr = (ru: string, en: string) => (lang === "ru" ? ru : en);
  return `<button class="modal-close icon-button" data-action="close" aria-label="${tr("Закрыть", "Close")}">×</button><span class="eyebrow">STORM / PREFERENCES</span><h2>${tr("Настройки", "Settings")}</h2><section class="settings-section"><h3>${tr("Ориентация экрана", "Screen orientation")}</h3><div class="orientation-choices">${[
    ["auto", tr("Авто", "Auto"), "↻"],
    ["portrait", tr("Вертикально", "Portrait"), "▯"],
    ["landscape", tr("Горизонтально", "Landscape"), "▭"],
  ]
    .map(
      ([id, title, mark]) =>
        `<button class="${g.state.orientation === id ? "chosen" : ""}" data-orientation="${id}"><span>${mark}</span>${title}</button>`,
    )
    .join(
      "",
    )}</div><p class="settings-note">${tr("Если браузер поддерживает закрепление ориентации, игра перейдёт в полноэкранный режим. Иначе просто поверни телефон — игра подстроится.", "Where supported, orientation locking enters fullscreen. Otherwise, rotate your phone and the game will adapt.")}</p>${result ? `<p class="orientation-result" role="status">${result === "locked" ? tr("Ориентация закреплена.", "Orientation locked.") : result === "auto" ? tr("Автоповорот включён.", "Automatic rotation enabled.") : tr("Поверни телефон в выбранное положение. Браузер не разрешил закрепить ориентацию.", "Rotate your phone to the selected orientation. This browser did not allow locking.")}</p>` : ""}</section><section class="settings-section settings-toggles"><label>${tr("Звук", "Sound")}<button class="secondary" data-setting="sound">${g.state.sound ? tr("Включён", "On") : tr("Выключен", "Off")}</button></label><label>${tr("Быстрые открытия", "Fast openings")}<button class="secondary" data-setting="fast">${g.state.fast ? tr("Включены", "On") : tr("Выключены", "Off")}</button></label><label>${tr("Язык", "Language")}<button class="secondary" data-setting="language">${lang === "ru" ? "Русский" : "English"}</button></label><label>${tr("Полный экран", "Fullscreen")}<button class="secondary" data-action="fullscreen">${tr("Развернуть", "Enter")}</button></label></section><button class="primary picker-done" data-action="close">${tr("Готово", "Done")}</button>`;
}
