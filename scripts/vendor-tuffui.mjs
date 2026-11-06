// Vendors the TuffUI (https://tuffui.com, MIT) registry items the Marketplace MCP cards use into
// mcp-ui/vendor, applying the house rules (no pills, no 240-300 hues, 12px floor).
// Usage: node scripts/vendor-tuffui.mjs <dir with TuffUI registry JSON>   (fetch https://tuffui.com/r/<name>.json first)
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { rules, STATUS, phosphorModule } from './tuffui-rules.mjs';
const REG = process.argv[2] ?? '/tmp/tuffui/reg';
const OUT = new URL('../mcp-ui/vendor/', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });
const NAMES = ['result-carousel','action-button','tooltip-hint','rolling-number','surface','motion-tokens','confirmation-card','progress-bar','form-card','choice-controls','select-field','loader','text-field','tab-panels','empty-state','segmented-control'];
const spec = s => { let m;
  if ((m = /^@\/components\/ui\/([\w-]+)$/.exec(s))) return m[1];
  if ((m = /^\.\/([\w-]+)$/.exec(s))) return m[1];
  if (s === '@/lib/motion-tokens') return 'motion-tokens';
  if ((m = /^@\/registry\/([\w-]+)\/[\w-]+$/.exec(s))) return m[1];
  return null; };
const sources = {};
for (const n of NAMES) sources[n] = JSON.parse(readFileSync(`${REG}/${n}.json`, 'utf8')).files.map(f => f.content).join('\n');
sources['status-pill'] = STATUS;
const names = new Set(['Truck','MapPin','CreditCard','ShoppingCart','Receipt','Storefront','SignIn','ForkKnife','WarningCircle','CheckCircle','EnvelopeSimple','LockKey','Package']);
for (const [n, src0] of Object.entries(sources)) {
  let src = n === 'status-pill' ? src0 : rules(src0, n);
  src = src.replace(/from "([^"]+)"/g, (all, s) => {
    if (s === '@phosphor-icons/react') return 'from "./icons"';
    if (s === 'motion/react') return 'from "framer-motion"';
    if (s === 'radix-ui') return 'from "./radix"';
    if (s === '@/lib/utils') return 'from "./cn"';
    const m = spec(s); return m ? `from "./${m}"` : all;
  });
  // The Marketplace login card needs a password field; FormCard's text control already passes `type` through.
  if (n === 'form-card') src = src.replace('"text" | "email" | "number"', '"text" | "email" | "password" | "number"');
  for (const m of src.matchAll(/import\s*(?:type\s*)?\{([^}]*)\}\s*from\s*"\.\/icons"/g)) for (const p of m[1].split(',')) { const c = p.trim().replace(/^type\s+/, '').split(/\s+as\s+/)[0]; if (c && c !== 'Icon' && c !== 'IconProps') names.add(c); }
  writeFileSync(OUT + n + (n === 'motion-tokens' ? '.ts' : '.tsx'), src);
}
writeFileSync(OUT + 'icons.tsx', phosphorModule([...names].sort()).text);
writeFileSync(OUT + 'cn.ts', `import { clsx, type ClassValue } from "clsx";\nimport { twMerge } from "tailwind-merge";\nexport function cn(...inputs: ClassValue[]) {\n  return twMerge(clsx(inputs));\n}\n`);
writeFileSync(OUT + 'radix.ts', `// The \`radix-ui\` umbrella package is not installed; the scoped packages are.\nimport * as Popover from "@radix-ui/react-popover";\nimport * as Select from "@radix-ui/react-select";\nexport { Popover, Select };\n`);
console.log('vendored', Object.keys(sources).length, 'items,', names.size, 'icons');
