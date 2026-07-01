import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const budgetPath = path.resolve(rootDir, "config/model-budget.json");
const reportsDir = path.resolve(rootDir, "reports/model-budget");
const reportPath = path.join(reportsDir, "lifter-budget-report.md");

function toProjectPath(targetPath) {
  return path.relative(rootDir, targetPath).replaceAll(path.sep, "/");
}

function fromProjectPath(projectPath) {
  return path.resolve(rootDir, projectPath);
}

function runtimeUrlToPublicPath(url) {
  return path.resolve(rootDir, "public", url.replace(/^\//, ""));
}

function readJson(projectPath) {
  return JSON.parse(readFileSync(fromProjectPath(projectPath), "utf8"));
}

function readGlbJson(glbPath) {
  const buffer = readFileSync(glbPath);
  if (buffer.toString("utf8", 0, 4) !== "glTF") {
    throw new Error("not a binary GLB file");
  }

  let offset = 12;
  while (offset + 8 <= buffer.length) {
    const chunkLength = buffer.readUInt32LE(offset);
    const chunkType = buffer.toString("utf8", offset + 4, offset + 8);
    const chunkStart = offset + 8;
    const chunkEnd = chunkStart + chunkLength;
    if (chunkType === "JSON") {
      return JSON.parse(buffer.toString("utf8", chunkStart, chunkEnd).trim());
    }
    offset = chunkEnd;
  }

  throw new Error("GLB JSON chunk not found");
}

function countModelStats(gltf) {
  let meshCount = 0;
  let vertexCount = 0;
  let triangleCount = 0;
  const accessors = gltf.accessors ?? [];

  for (const node of gltf.nodes ?? []) {
    if (node.mesh !== undefined) {
      meshCount += 1;
    }
  }

  for (const mesh of gltf.meshes ?? []) {
    for (const primitive of mesh.primitives ?? []) {
      const positionAccessorIndex = primitive.attributes?.POSITION;
      if (positionAccessorIndex !== undefined) {
        vertexCount += accessors[positionAccessorIndex]?.count ?? 0;
      }

      if (primitive.indices !== undefined) {
        triangleCount += Math.floor((accessors[primitive.indices]?.count ?? 0) / 3);
      } else if (positionAccessorIndex !== undefined) {
        triangleCount += Math.floor((accessors[positionAccessorIndex]?.count ?? 0) / 3);
      }
    }
  }

  return {
    meshCount,
    materialCount: (gltf.materials ?? []).length,
    vertexCount,
    triangleCount,
  };
}

function compareLimit(label, actual, limit, unit = "") {
  const passed = actual <= limit;
  return {
    label,
    actual,
    limit,
    unit,
    passed,
    severity: passed ? "ok" : "warning",
    message: passed
      ? `${label}: ${actual}${unit} <= ${limit}${unit}`
      : `${label}: ${actual}${unit} > ${limit}${unit}`,
  };
}

function collectForbiddenFiles(startDir, extensions) {
  const ignored = new Set([".git", "node_modules", "dist"]);
  const results = [];

  function walk(dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (!ignored.has(entry.name)) {
          walk(path.join(dir, entry.name));
        }
        continue;
      }

      const extension = path.extname(entry.name).toLowerCase();
      if (extensions.includes(extension)) {
        results.push(toProjectPath(path.join(dir, entry.name)));
      }
    }
  }

  walk(startDir);
  return results;
}

function createReport({ budget, modelPath, modelStats, checks, levelChecks, forbiddenFiles }) {
  const lines = [
    "# Model Budget Report",
    "",
    `- generatedAt: ${new Date().toISOString()}`,
    `- model: ${toProjectPath(modelPath)}`,
    `- warnOnly: ${budget.warnOnly}`,
    "",
    "## Model Stats",
    "",
    `- fileSizeMb: ${modelStats.fileSizeMb}`,
    `- meshCount: ${modelStats.meshCount}`,
    `- materialCount: ${modelStats.materialCount}`,
    `- vertexCount: ${modelStats.vertexCount}`,
    `- triangleCount: ${modelStats.triangleCount}`,
    "",
    "## Budget Checks",
    "",
  ];

  for (const check of checks) {
    lines.push(`- [${check.passed ? "x" : "!"}] ${check.message}`);
  }

  lines.push("", "## LOD Files", "");
  for (const check of levelChecks) {
    lines.push(`- [${check.exists ? "x" : "!"}] ${check.level}: ${check.path}`);
  }

  lines.push("", "## Forbidden Source Files", "");
  if (forbiddenFiles.length === 0) {
    lines.push("- [x] no STEP/STP/IGES/FBX files found in repository tree");
  } else {
    for (const file of forbiddenFiles) {
      lines.push(`- [!] ${file}`);
    }
  }

  return `${lines.join("\n")}\n`;
}

if (!existsSync(budgetPath)) {
  console.error("model budget config not found: config/model-budget.json");
  process.exit(1);
}

const budget = JSON.parse(readFileSync(budgetPath, "utf8"));
const modelConfigExists = existsSync(fromProjectPath(budget.modelConfigPath));
const manifestExists = existsSync(fromProjectPath(budget.manifestPath));
const manifest = manifestExists ? readJson(budget.manifestPath) : undefined;
const defaultRuntimeUrl = manifest?.levels?.source ?? budget.defaultModelPath.replace(/^public/, "");
const modelPath = defaultRuntimeUrl.startsWith("/")
  ? runtimeUrlToPublicPath(defaultRuntimeUrl)
  : fromProjectPath(budget.defaultModelPath);

const levelChecks = [];
if (manifest?.levels) {
  for (const level of [...budget.requiredLevels, ...budget.optionalLevels]) {
    const runtimeUrl = manifest.levels[level];
    const levelPath = runtimeUrl ? runtimeUrlToPublicPath(runtimeUrl) : undefined;
    levelChecks.push({
      level,
      path: runtimeUrl ?? "-",
      exists: Boolean(levelPath && existsSync(levelPath)),
    });
  }
}

const checks = [
  {
    label: "model config exists",
    passed: modelConfigExists,
    message: `model config exists: ${budget.modelConfigPath}`,
  },
  {
    label: "manifest exists",
    passed: manifestExists,
    message: `manifest exists: ${budget.manifestPath}`,
  },
  {
    label: "default model exists",
    passed: existsSync(modelPath),
    message: `default model exists: ${toProjectPath(modelPath)}`,
  },
];

let modelStats = {
  fileSizeMb: 0,
  meshCount: 0,
  materialCount: 0,
  vertexCount: 0,
  triangleCount: 0,
};

if (existsSync(modelPath)) {
  const gltf = readGlbJson(modelPath);
  const sizeMb = statSync(modelPath).size / 1024 / 1024;
  modelStats = {
    fileSizeMb: Number(sizeMb.toFixed(2)),
    ...countModelStats(gltf),
  };
  checks.push(
    compareLimit("fileSizeMb", modelStats.fileSizeMb, budget.budgets.maxFileSizeMb, "MB"),
    compareLimit("meshCount", modelStats.meshCount, budget.budgets.maxMeshCount),
    compareLimit("materialCount", modelStats.materialCount, budget.budgets.maxMaterialCount),
    compareLimit("vertexCount", modelStats.vertexCount, budget.budgets.maxVertexCount),
    compareLimit("triangleCount", modelStats.triangleCount, budget.budgets.maxTriangleCount),
  );
}

for (const check of levelChecks) {
  if (!check.exists && budget.requiredLevels.includes(check.level)) {
    checks.push({
      label: `${check.level} exists`,
      passed: false,
      message: `required LOD level missing: ${check.level} ${check.path}`,
    });
  }
}

const forbiddenFiles = collectForbiddenFiles(rootDir, budget.forbiddenSourceExtensions);
checks.push({
  label: "forbidden source model files",
  passed: forbiddenFiles.length === 0,
  message:
    forbiddenFiles.length === 0
      ? "no STEP/STP/IGES/FBX files found"
      : `forbidden source model files found: ${forbiddenFiles.length}`,
});

mkdirSync(reportsDir, { recursive: true });
writeFileSync(
  reportPath,
  createReport({ budget, modelPath, modelStats, checks, levelChecks, forbiddenFiles }),
  "utf8",
);

const warnings = checks.filter((check) => !check.passed);
for (const check of checks) {
  const prefix = check.passed ? "[ok]" : "[warning]";
  console.log(`${prefix} ${check.message}`);
}
for (const check of levelChecks.filter((item) => !item.exists && budget.optionalLevels.includes(item.level))) {
  console.log(`[warning] optional LOD level missing: ${check.level} ${check.path}`);
}
console.log(`[ok] report written: ${toProjectPath(reportPath)}`);

if (warnings.length > 0 && !budget.warnOnly) {
  process.exit(1);
}
