// Optimize generated image copies for small UI use. Generated originals are retained.
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
const require = createRequire(import.meta.url);
const sharp = require(
  require.resolve("sharp", {
    paths: [
      process.env.STORM_IMAGE_MODULES ||
        "C:/Users/PC/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules",
    ],
  }),
);
const root =
  "E:/Codex/Data/generated_images/01a150be-db1d-7452-94df-4aa5689cf19c/";
const sources = {
  cases: "exec-dcfaeb8a-6104-4c33-9421-a01e4b1f60b1.png",
  upgrade: "exec-abb0cbd1-b82c-434a-8d05-f02b0a780dea.png",
  contracts: "exec-87661e55-3e2c-472c-a521-50f928be3783.png",
  battles: "exec-7e2b939f-2b80-4479-af18-e75bea214fa5.png",
  inventory: "exec-a671a976-06a9-4eee-9f0b-15c5bc5454a9.png",
  bonuses: "exec-a1cc8c7f-8849-4edb-afd5-b6d051dd64ef.png",
  tasks: "exec-78e2f049-5db6-4df7-958f-a4a83b1f3b99.png",
  settings: "exec-7b173e3f-3ca5-465b-9c47-89d7f676bbb1.png",
};
await mkdir("public/storm/icons", { recursive: true });
const files = [];
for (const [id, file] of Object.entries(sources)) {
  const source = root + file,
    destination = `public/storm/icons/${id}.webp`;
  const metadata = await sharp(source).metadata();
  if (!metadata.hasAlpha) throw Error(`Missing generated transparency: ${id}`);
  await sharp(source)
    .trim()
    .resize(96, 96, { fit: "contain", background: "#00000000" })
    .webp({ lossless: true })
    .toFile(destination);
  files.push({ id, source, destination, width: 96, height: 96 });
}
await writeFile(
  "artifacts/storm/navigation-icon-manifest.json",
  JSON.stringify({ tool: "built-in image_gen", files }, null, 2),
);
console.log(`Imported ${files.length} generated icons.`);
