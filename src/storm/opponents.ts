export const OPPONENTS = [
  { id: "volt", name: "VOLT", mark: "ϟ", color: "#e9be64" },
  { id: "fox", name: "StormFox", mark: "◈", color: "#f49a75" },
  { id: "neon", name: "NeonCat", mark: "✧", color: "#c69cff" },
  { id: "ice", name: "IceWolf", mark: "❖", color: "#8acfe6" },
  { id: "red", name: "RedLine", mark: "✦", color: "#f28092" },
  { id: "lucky", name: "LuckyPalm", mark: "♧", color: "#9ed6aa" },
] as const;
export const opponentFor = (id?: string) =>
  OPPONENTS.find((x) => x.id === id) ?? OPPONENTS[0];
