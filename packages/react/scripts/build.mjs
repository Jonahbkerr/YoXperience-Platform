// Bundle the React SDK to ESM + CJS with React kept external (peer dependency).
// Type declarations are emitted separately by `tsc` (see package.json build).
import { build } from "esbuild";

const shared = {
  entryPoints: ["src/index.ts"],
  bundle: true,
  external: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime"],
  jsx: "automatic",
  target: "es2019",
  logLevel: "info",
};

await build({ ...shared, format: "esm", outfile: "dist/index.js" });
await build({ ...shared, format: "cjs", outfile: "dist/index.cjs" });
console.log("[@yoxperience/react] esbuild: dist/index.js (esm) + dist/index.cjs (cjs)");
