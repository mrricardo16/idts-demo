import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const inputArg = process.argv[2] ?? "public/models/lifter.glb";
const inputPath = path.resolve(rootDir, inputArg);
const outputDir = path.resolve(rootDir, "public/models/lifter");
const reportDir = path.resolve(rootDir, "reports/model-lod");
const reportPath = path.join(reportDir, "lifter-lod-report.md");
const outputs = {
  high: path.join(outputDir, "lifter.high.glb"),
  medium: path.join(outputDir, "lifter.medium.glb"),
  low: path.join(outputDir, "lifter.low.glb"),
};

const results = [];

function toProjectPath(targetPath) {
  return path.relative(rootDir, targetPath).replaceAll(path.sep, "/");
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes)) {
    return "-";
  }

  const mb = bytes / 1024 / 1024;
  return `${mb.toFixed(2)} MB`;
}

function fileSize(targetPath) {
  return existsSync(targetPath) ? statSync(targetPath).size : undefined;
}

function commandExists(command) {
  const result = spawnSync(command, ["--version"], { encoding: "utf8", shell: true });
  return {
    ok: !result.error && result.status === 0,
    version: (result.stdout || result.stderr || "").trim(),
  };
}

function runGltfTransform(args) {
  const result = spawnSync("gltf-transform", args, { encoding: "utf8", shell: true });
  return {
    ok: !result.error && result.status === 0,
    output: [result.stdout, result.stderr].filter(Boolean).join("\n").trim(),
    status: result.status,
  };
}

function addResult(level, status, message, output = "") {
  const filePath = outputs[level];
  results.push({
    level,
    filePath,
    status,
    message,
    output,
    size: fileSize(filePath),
  });
}

function writeReport(cliInfo) {
  mkdirSync(reportDir, { recursive: true });
  const lines = [
    "# 提升机 LOD 生成报告",
    "",
    `- 输入模型：${toProjectPath(inputPath)}`,
    `- 输出目录：${toProjectPath(outputDir)}`,
    `- 生成时间：${new Date().toISOString()}`,
    `- gltf-transform：${cliInfo.ok ? cliInfo.version : "未安装"}`,
    "",
    "## 输出结果",
    "",
    "| level | file | status | size | message |",
    "| --- | --- | --- | --- | --- |",
  ];

  for (const result of results) {
    lines.push(
      `| ${result.level} | ${toProjectPath(result.filePath)} | ${result.status} | ${formatBytes(result.size)} | ${result.message.replaceAll("|", "\\|")} |`,
    );
  }

  lines.push(
    "",
    "## 模型复杂度",
    "",
    "当前阶段未内置 GLB 解析器，mesh / material / vertex / triangle 统计依赖 `gltf-transform inspect`。如果 CLI 未安装或命令失败，请先运行：",
    "",
    "```bash",
    "npm install --global @gltf-transform/cli",
    "npm run model:inspect",
    "```",
    "",
    "## 语义对象检查",
    "",
    "- 当前 manifest 中 `semantic.movableParts` 为空，无法自动验证可动部件是否在 medium / low 中保留。",
    "- 自动简化不能代替业务语义拆分；正式模型仍需要在 CAD / Blender 中拆分并命名可动部件。",
    "",
    "## 风险说明",
    "",
    "- 本脚本不生成 BoxGeometry proxy。",
    "- 本脚本不读取 `source-models` 下的 STEP / STP / CAD 源模型。",
    "- 如果 medium / low 生成失败，前端仍会按现有策略回退到 source，并保留当前模型。",
  );

  const failedOutput = results
    .filter((result) => result.output)
    .map((result) => `### ${result.level}\n\n\`\`\`text\n${result.output}\n\`\`\``);
  if (failedOutput.length > 0) {
    lines.push("", "## 命令输出", "", failedOutput.join("\n\n"));
  }

  writeFileSync(reportPath, `${lines.join("\n")}\n`, "utf8");
  console.log(`LOD 报告已输出：${toProjectPath(reportPath)}`);
}

if (toProjectPath(inputPath).startsWith("source-models/")) {
  console.error("拒绝读取 source-models 下的 STEP/STP/CAD 源模型目录。请传入 public/models 下的 GLB 文件。");
  process.exit(1);
}

if (!existsSync(inputPath) || !statSync(inputPath).isFile()) {
  console.error(`输入模型不存在：${toProjectPath(inputPath)}`);
  process.exit(1);
}

mkdirSync(outputDir, { recursive: true });

copyFileSync(inputPath, outputs.high);
addResult("high", "success", "high 已复制 source 模型，用作当前高精档。");

const cliInfo = commandExists("gltf-transform");
if (!cliInfo.ok) {
  const message = "未检测到 gltf-transform CLI，medium / low 未生成。请安装：npm install --global @gltf-transform/cli";
  console.warn(message);
  addResult("medium", "skipped", message);
  addResult("low", "skipped", message);
  writeReport(cliInfo);
  process.exit(0);
}

const mediumResult = runGltfTransform(["optimize", inputPath, outputs.medium]);
if (mediumResult.ok) {
  addResult("medium", "success", "medium 已通过 gltf-transform optimize 生成。", mediumResult.output);
} else {
  addResult("medium", "failed", "medium 生成失败，请以当前 gltf-transform optimize --help 为准检查参数。", mediumResult.output);
}

const lowResult = runGltfTransform(["simplify", inputPath, outputs.low, "--ratio", "0.25"]);
if (lowResult.ok) {
  addResult("low", "success", "low 已通过 gltf-transform simplify --ratio 0.25 生成。", lowResult.output);
} else {
  addResult("low", "failed", "low 生成失败，请以当前 gltf-transform simplify --help 为准检查参数。", lowResult.output);
}

writeReport(cliInfo);

if (!mediumResult.ok || !lowResult.ok) {
  process.exit(1);
}
