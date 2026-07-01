import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { spawnSync } from "node:child_process";

const input = process.argv[2] ?? "public/models/lifter.glb";
const output = process.argv[3] ?? "public/models/lifter.high.glb";

function run(command, args) {
  const result = spawnSync(command, args, { stdio: "inherit", shell: true });
  if (result.error || result.status !== 0) {
    console.error("\n模型优化失败。请确认已安装 gltf-transform CLI：");
    console.error("npm install --global @gltf-transform/cli");
    console.error("如果参数与当前版本不兼容，请以 gltf-transform help 为准。");
    process.exit(result.status ?? 1);
  }
}

mkdirSync(dirname(output), { recursive: true });
run("gltf-transform", [
  "optimize",
  input,
  output,
  "--compress",
  "draco",
  "--texture-compress",
  "webp",
]);
