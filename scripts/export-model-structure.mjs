import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Box3, Mesh, Vector3 } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const modelPath = path.join(projectRoot, "public", "models", "lifter.glb");
const outputDir = path.join(projectRoot, "debug");
const jsonPath = path.join(outputDir, "model-structure.json");
const csvPath = path.join(outputDir, "model-structure.csv");

function toSnapshot(vector) {
  return {
    x: vector.x,
    y: vector.y,
    z: vector.z,
  };
}

function getDepth(object, root) {
  let depth = 0;
  let current = object.parent;
  while (current && current !== root) {
    depth += 1;
    current = current.parent;
  }

  return depth;
}

function createDisplayName(object, unnamedIndex) {
  if (object.name) {
    return object.name;
  }

  return `unnamed_mesh_${String(unnamedIndex).padStart(3, "0")}`;
}

function getBoundingBox(object) {
  const box = new Box3().setFromObject(object);
  if (box.isEmpty()) {
    return null;
  }

  const size = new Vector3();
  box.getSize(size);

  return {
    min: toSnapshot(box.min),
    max: toSnapshot(box.max),
    size: toSnapshot(size),
  };
}

function collectModelObjectTree(root) {
  const nodes = [];
  let unnamedIndex = 0;

  root.traverse((object) => {
    if (object.type !== "Group" && !(object instanceof Mesh)) {
      return;
    }

    if (!object.name) {
      unnamedIndex += 1;
    }

    const parent = object.parent;
    const displayName = createDisplayName(object, unnamedIndex);
    const parentName = parent ? parent.name || parent.type : "";

    nodes.push({
      id: object.uuid,
      name: displayName,
      originalName: object.name,
      type: object.type,
      uuid: object.uuid,
      parentName,
      depth: getDepth(object, root),
      position: {
        x: object.position.x,
        y: object.position.y,
        z: object.position.z,
      },
      rotation: {
        x: object.rotation.x,
        y: object.rotation.y,
        z: object.rotation.z,
      },
      scale: {
        x: object.scale.x,
        y: object.scale.y,
        z: object.scale.z,
      },
      boundingBox: getBoundingBox(object),
    });
  });

  return nodes;
}

function csvEscape(value) {
  if (value === null || value === undefined) {
    return "";
  }

  const text = String(value);
  if (!/[",\r\n]/.test(text)) {
    return text;
  }

  return `"${text.replaceAll('"', '""')}"`;
}

function vectorFields(prefix, vector) {
  return {
    [`${prefix}X`]: vector?.x ?? "",
    [`${prefix}Y`]: vector?.y ?? "",
    [`${prefix}Z`]: vector?.z ?? "",
  };
}

function flattenNode(node) {
  return {
    id: node.id,
    name: node.name,
    originalName: node.originalName,
    type: node.type,
    uuid: node.uuid,
    parentName: node.parentName,
    depth: node.depth,
    ...vectorFields("position", node.position),
    ...vectorFields("rotation", node.rotation),
    ...vectorFields("scale", node.scale),
    ...vectorFields("boundingBoxMin", node.boundingBox?.min),
    ...vectorFields("boundingBoxMax", node.boundingBox?.max),
    ...vectorFields("boundingBoxSize", node.boundingBox?.size),
  };
}

function toCsv(nodes) {
  const rows = nodes.map(flattenNode);
  const headers = Object.keys(rows[0] ?? {});
  return [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(",")),
  ].join("\n");
}

async function loadGlbScene() {
  const buffer = fs.readFileSync(modelPath);
  const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
  const loader = new GLTFLoader();

  return new Promise((resolve, reject) => {
    loader.parse(arrayBuffer, "", (gltf) => resolve(gltf.scene), reject);
  });
}

const scene = await loadGlbScene();
const nodes = collectModelObjectTree(scene);

fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(jsonPath, `${JSON.stringify(nodes, null, 2)}\n`, "utf8");
fs.writeFileSync(csvPath, `${toCsv(nodes)}\n`, "utf8");

console.log(`Exported ${nodes.length} model nodes`);
console.log(path.relative(projectRoot, jsonPath));
console.log(path.relative(projectRoot, csvPath));
