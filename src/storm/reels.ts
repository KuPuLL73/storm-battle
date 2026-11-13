import { caseFor, pick, skin, type CaseId } from "./engine";

type ReelContext = {
  image: (id: number, cls?: string, lazy?: boolean) => string;
  name: (id: number) => string;
  escape: (v: unknown) => string;
};
export type ReelEntry = { caseId: CaseId; skinId: number; label: string };
/** The real outcome is supplied by the committed transaction. Other tiles are decorative. */
export function reelMarkup(
  entries: ReelEntry[],
  c: ReelContext,
  compact = false,
) {
  const tile = compact
    ? 118
    : matchMedia("(max-width:600px)").matches
      ? 126
      : 170;
  const winner = 25;
  return `<div class="storm-reels ${compact ? "compact-reels" : ""} ${entries.length > 1 ? "batch-reels" : ""}" data-reel-count="${entries.length}" style="--tile:${tile}px">${entries
    .map((entry, index) => {
      const pool = caseFor(entry.caseId),
        ids = Array.from({ length: 32 }, () => pick(pool, Math.random()));
      ids[winner] = entry.skinId;
      return `<section class="storm-reel" data-reel-index="${index}"><span class="reel-label">${c.escape(entry.label)}</span><div class="reel-window"><span class="reel-pointer top"></span><div class="reel-track">${ids.map((id, i) => `<div class="reel-item ${i === winner ? "committed-drop" : ""}" data-skin="${id}" style="--rarity:${skin(id).color}">${c.image(id, "", false)}<small>${c.escape(skin(id).weapon)}</small><strong>${c.escape(c.name(id))}</strong></div>`).join("")}</div><span class="reel-pointer bottom"></span></div></section>`;
    })
    .join("")}</div>`;
}

/** Anchoring the track at 50% keeps the committed tile centered after an orientation change. */
export function startReels(container: Element, duration: number) {
  const tile = Number.parseFloat(
    getComputedStyle(container.querySelector(".storm-reels") ?? container).getPropertyValue("--tile"),
  );
  const endpoint = -(25 * (tile + 8) + tile / 2);
  return [...container.querySelectorAll(".reel-track")].map((track, i) =>
    track.animate(
      [
        { transform: `translateX(${-1.5 * (tile + 8)}px)` },
        { transform: `translateX(${endpoint}px)` },
      ],
      {
        duration,
        delay: i * 85,
        easing: "cubic-bezier(.12,.65,.13,1)",
        fill: "both",
      },
    ),
  );
}
