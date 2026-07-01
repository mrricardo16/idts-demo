import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const inputArg = process.argv[2] ?? "public/models/lifter.glb";
const inputPath = path.resolve(rootDir, inputArg);
const reportsDir = path.resolve(rootDir, "reports/model-inspect");
const reportPath = path.join(reportsDir, "lifter-inspect-report.md");

function toProjectPath(targetPath) {
  return path.relative(rootDir, targetPath).replaceAll(path.sep, "/");
}

function writeReport(content) {
  mkdirSync(reportsDir, { recursive: true });
  writeFileSync(reportPath, content, "utf8");
  console.log(`模型体检报告已输出：${toProjectPath(reportPath)}`);
}

function createReport({ status, input, cliVersion = "", output = "", error = "" }) {
  const lines = [
    "# GLB 模型体检报告",
    "",
    `- 输入模型：${input}`,
    `- 检查状态：${status}`,
    `- 生成时间：${new Date().toISOString()}`,
  ];

  if (cliVersion) {
    lines.push(`- gltf-transform：${cliVersion.trim()}`);
  }

  if (error) {
    lines.push("", "## 提示", "", error);
  }

  if (output) {
    lines.push("", "## gltf-transform inspect 输出", "", "```text", output.trim(), "```");
  }

  return `${lines.join("\n")}\n`;
}

if (toProjectPath(inputPath).startsWith("source-models/")) {
  const message = "拒绝读取 source-models 下的 STEP/STP/CAD 源模型目录。请传入 public/models 下的 GLB 文件。";
  console.error(message);
  writeReport(createReport({ status: "blocked", input: toProjectPath(inputPath), error: message }));
  process.exit(1);
}

if (!existsSync(inputPath) || !statSync(inputPath).isFile()) {
  const message = `模型文件不存在：${toProjectPath(inputPath)}`;
  console.error(message);
  writeReport(createReport({ status: "failed", input: toProjectPath(inputPath), error: message }));
  process.exit(1);
}

const versionResult = spawnSync("gltf-transform", ["--version"], {
  encoding: "utf8",
  shell: true,
});

if (versionResult.error || versionResult.status !== 0) {
  const message = [
    "未检测到 gltf-transform CLI，已跳过在线 inspect。",
    "请先安装：npm install --global @gltf-transform/cli",
  ].join("\n");
  console.warn(message);
  writeReport(createReport({
    status: "skipped",
    input: toProjectPath(inputPath),
    error: message,
  }));
  process.exit(0);
}

const inspectResult = spawnSync("gltf-transform", ["inspect", inputPath], {
  encoding: "utf8",
  shell: true,
});
const output = [inspectResult.stdout, inspectResult.stderr].filter(Boolean).join("\n");

if (inspectResult.status !== 0) {
  const message = "gltf-transform inspect 执行失败，请以当前 CLI 版本 help 为准检查参数或模型文件。";
  console.error(message);
  writeReport(createReport({
    status: "failed",
    input: toProjectPath(inputPath),
    cliVersion: versionResult.stdout || versionResult.stderr,
    output,
    error: message,
  }));
  process.exit(inspectResult.status ?? 1);
}

console.log(output);
writeReport(createReport({
  status: "success",
  input: toProjectPath(inputPath),
  cliVersion: versionResult.stdout || versionResult.stderr,
  output,
}));
