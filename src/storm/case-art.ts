import { caseFor } from "./engine";

// Each themed collection uses one of the authored tactical container renders.
const artwork: Record<string, string> = {
  street: "street",
  neon: "neon",
  redline: "redline",
  frost: "frost",
  gold: "gold",
  storm: "storm",
  budget: "jade",
  pistols: "redline",
  snipers: "frost",
  noir: "neon",
  beast: "street",
  hotrod: "redline",
  asiimov: "asiimov",
  monochrome: "monochrome",
  flame: "flame",
  knives: "knives",
  gloves: "gloves",
  split: "redline",
  dragon50: "gold",
  jade: "jade",
  abyss: "storm",
  volcano: "flame",
  diamond: "frost",
  prism: "neon",
  moon: "monochrome",
  sun: "gold",
  seraph: "monochrome",
  phoenix: "redline",
  crown: "jade",
  tiger: "gold",
  cosmos: "storm",
  emperor: "gold",
  relic: "knives",
};

export function caseArtwork(id: string) {
  const c = caseFor(id);
  return `storm/cases/${artwork[id] ?? c.art ?? id}.png`;
}
