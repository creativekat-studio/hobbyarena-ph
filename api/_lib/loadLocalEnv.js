import { existsSync, readFileSync } from "fs";
import { resolve } from "path";

let loaded = false;

/** vercel dev does not always inject .env.local into /api handlers — load it once. */
export function loadLocalEnv() {
  if (loaded) return;
  loaded = true;

  const root = process.cwd();
  for (const file of [".env.local", ".env"]) {
    const path = resolve(root, file);
    if (!existsSync(path)) continue;

    for (const line of readFileSync(path, "utf8").split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"'))
        || (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (key && process.env[key] === undefined) {
        process.env[key] = value;
      }
    }
  }
}
