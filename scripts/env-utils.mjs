import { access, readFile } from "node:fs/promises";
import path from "node:path";

function parseEnvLine(line) {
  const trimmed = line.trim();

  if (!trimmed || trimmed.startsWith("#")) {
    return null;
  }

  const normalized = trimmed.startsWith("export ") ? trimmed.slice(7).trim() : trimmed;
  const separatorIndex = normalized.indexOf("=");

  if (separatorIndex === -1) {
    return null;
  }

  const key = normalized.slice(0, separatorIndex).trim();

  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) {
    return null;
  }

  let value = normalized.slice(separatorIndex + 1).trim();

  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }

  return [key, value];
}

async function fileExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function loadLocalEnvFiles({
  cwd = process.cwd(),
  filenames = [".env", ".env.local"],
} = {}) {
  const loadedValues = new Map();

  for (const filename of filenames) {
    const filePath = path.join(cwd, filename);

    if (!(await fileExists(filePath))) {
      continue;
    }

    const contents = await readFile(filePath, "utf8");

    for (const rawLine of contents.replace(/^\uFEFF/, "").split(/\r?\n/)) {
      const parsedLine = parseEnvLine(rawLine);

      if (parsedLine !== null) {
        loadedValues.set(parsedLine[0], parsedLine[1]);
      }
    }
  }

  for (const [key, value] of loadedValues) {
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

export function hasEnvValue(name) {
  return Boolean(process.env[name]?.trim());
}

export function printEnvPresence(names) {
  for (const name of names) {
    console.log(`- ${name}: ${hasEnvValue(name) ? "present" : "missing"}`);
  }
}

export function safeDbErrorSummary(error) {
  if (error && typeof error === "object") {
    const code = "code" in error && typeof error.code === "string" ? error.code : null;
    const name = "name" in error && typeof error.name === "string" ? error.name : "Error";

    return code === null ? name : `${name} (${code})`;
  }

  return "UnknownError";
}
