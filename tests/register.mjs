import { existsSync } from "node:fs";
import { registerHooks } from "node:module";
import { dirname, resolve as resolvePath } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

/**
 * Test-runner module resolution.
 *
 * Next.js resolves extensionless relative imports and the `@/*` path alias from
 * tsconfig. Node's ESM resolver does neither, so without this the application
 * modules would have to be written in a style that only exists to satisfy the
 * tests. This hook teaches `node --test` the same two rules; Node 24 strips the
 * TypeScript itself, so no transpiler is involved.
 *
 * Registered via `--import ./tests/register.mjs` in the `test` script.
 */

const projectRoot = resolvePath(dirname(fileURLToPath(import.meta.url)), "..");
const extensions = [".ts", ".tsx", ".mts", ".js"];

/** Try `<base><ext>` then `<base>/index<ext>`, returning the first that exists. */
function findFile(basePath) {
  for (const ext of extensions) {
    if (existsSync(basePath + ext)) return basePath + ext;
  }
  for (const ext of extensions) {
    const indexPath = resolvePath(basePath, `index${ext}`);
    if (existsSync(indexPath)) return indexPath;
  }
  return null;
}

registerHooks({
  resolve(specifier, context, nextResolve) {
    const isAlias = specifier.startsWith("@/");
    const isRelative = specifier.startsWith("./") || specifier.startsWith("../");

    if (isAlias || isRelative) {
      const basePath = isAlias
        ? resolvePath(projectRoot, "src", specifier.slice(2))
        : resolvePath(dirname(fileURLToPath(context.parentURL)), specifier);

      const found = existsSync(basePath) && !basePath.endsWith("/")
        ? basePath
        : findFile(basePath);

      if (found) {
        return { url: pathToFileURL(found).href, shortCircuit: true };
      }
    }

    return nextResolve(specifier, context);
  },
});
