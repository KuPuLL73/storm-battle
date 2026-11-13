// Extract existing generated inventory sprites and optimize project copies.
// Originals remain in Codex's generated_images directory.
import { sep } from "node:path";
import { createRequire } from "node:module";
import { mkdir, readFile, writeFile } from "node:fs/promises";
function sourceDirectory(name) {
  const directory = process.env[name];
  if (!directory) throw new Error(`Set ${name} to the directory containing the source images.`);
  return directory + sep;
}

const require = createRequire(import.meta.url);
const sharp = require(
  require.resolve("sharp", {
    paths: [
      process.env.STORM_IMAGE_MODULES || process.cwd(),
    ],
  }),
);
const previous = sourceDirectory("STORM_PREVIOUS_IMAGES");
const current = sourceDirectory("STORM_CURRENT_IMAGES");
const tactical = previous + "exec-87a7f81b-192a-4cdb-b75a-393f7af54ff0.png";
await mkdir("public/storm/art", { recursive: true });
const names = [
  "street",
  "neon",
  "redline",
  "frost",
  "gold",
  "storm",
  "asiimov",
  "monochrome",
  "flame",
  "knives",
  "gloves",
  "jade",
];
const metadata = await sharp(tactical).metadata();
const cellW = metadata.width / 4,
  cellH = metadata.height / 3;
if (!Number.isInteger(cellW) || !Number.isInteger(cellH))
  throw Error("Unequal atlas cells");
for (const [i, name] of names.entries()) {
  await sharp(tactical)
    .extract({
      left: (i % 4) * cellW,
      top: Math.floor(i / 4) * cellH,
      width: cellW,
      height: cellH,
    })
    .png({ compressionLevel: 9 })
    .toFile(`public/storm/cases/${name}.png`);
}
const copies = [
  [
    previous + "exec-8ca0c900-9d6f-4e84-ae35-12ffd7c4eed2.png",
    "emblem.png",
    96,
  ],
  [
    previous + "exec-a7f63093-e0e8-492c-8c8c-9e336ed668f5.png",
    "player.webp",
    128,
  ],
  [
    current + "exec-d9510e98-1bdf-44de-bbf6-a1ab759b820f.png",
    "armory.webp",
    1440,
  ],
  [
    current + "exec-e7914b9a-0ab1-4b72-b15d-bf55c14caee0.png",
    "reward.webp",
    480,
  ],
];
for (const [source, target, width] of copies) {
  let operation = sharp(source).resize({ width, withoutEnlargement: true });
  operation = target.endsWith(".webp")
    ? operation.webp({ quality: 88 })
    : operation.png({ compressionLevel: 9 });
  await operation.toFile("public/storm/art/" + target);
}
const extras = previous + "exec-2b2142d1-7c98-429a-bd76-814fa36128cf.png";
const extraMeta = await sharp(extras).metadata();
for (const [i, name] of [
  "daily",
  "wheel",
  "ticket",
  "inventory",
  "contract",
  "upgrade",
].entries()) {
  await sharp(extras)
    .extract({
      left: ((i % 3) * extraMeta.width) / 3,
      top: (Math.floor(i / 3) * extraMeta.height) / 2,
      width: extraMeta.width / 3,
      height: extraMeta.height / 2,
    })
    .resize({ width: 320 })
    .webp({ quality: 88 })
    .toFile(`public/storm/art/${name}.webp`);
}
const manifest = {
  importedAt: new Date().toISOString(),
  mode: "built-in image_gen",
  tacticalAtlas: { source: tactical, columns: 4, rows: 3, names },
  illustrations: {
    source: extras,
    columns: 3,
    rows: 2,
    names: ["daily", "wheel", "ticket", "inventory", "contract", "upgrade"],
  },
  copies: copies.map(([source, target]) => ({
    source,
    target: "public/storm/art/" + target,
  })),
};
await writeFile(
  "artifacts/storm/art-manifest.json",
  JSON.stringify(manifest, null, 2),
);
console.log("Imported 12 tactical case renders and 10 UI illustrations.");
