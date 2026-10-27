// Windows only (infra/web.ts runs it after the OpenNext build). Next.js links some packages
// (.next/node_modules/<name>-<hash>) with symlinks to the absolute D:\... path, which doesn't exist
// on Lambda, so the deployed site fails with "Cannot find package". This replaces each symlink in
// .open-next with a copy of the package from the same function bundle.
// Run from packages/web.
import fs from "node:fs";
import path from "node:path";

const web = process.cwd();
const repo = path.resolve(web, "../..");
const out = path.join(web, ".open-next");

function* symlinks(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isSymbolicLink()) yield full;
    else if (entry.isDirectory()) yield* symlinks(full);
  }
}

let fixed = 0;
for (const link of symlinks(out)) {
  const target = path.resolve(path.dirname(link), fs.readlinkSync(link));
  // The function's root: .open-next/<kind>/<function>/
  const [kind, fn] = path.relative(out, link).split(path.sep);
  const bundled = path.join(out, kind, fn, path.relative(repo, target));
  const source = fs.existsSync(bundled) ? bundled : target;
  fs.rmSync(link, { force: true, recursive: true });
  fs.cpSync(source, link, { recursive: true, dereference: true });
  console.log(`windows-links: ${path.relative(out, link)} <- ${path.relative(web, source)}`);
  fixed++;
}
console.log(`windows-links: replaced ${fixed} symlink(s)`);
