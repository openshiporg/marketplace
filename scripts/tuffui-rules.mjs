import { readFileSync, readdirSync } from "node:fs";
const ASSETS=process.env.PHOSPHOR_ASSETS??"/tmp/tuffui/phos/package/assets";
const HEX = { '#5e5ce6': '#a1a1a6', '#bf5af2': '#ff7ab2', '#a347d6': '#d6336c', '#d08cf5': '#ff9ec7', '#a626a4': '#c2185b', '#26073a': '#3a0719' };
function rules(src, name) {
  for (const [from, to] of Object.entries(HEX)) src = src.replaceAll(from, to).replaceAll(from.toUpperCase(), to);
  const PLAIN = [
    ['absolute top-2 left-2 rounded-full bg-surface-inset/90 px-2 py-0.5 text-[0.6875rem] font-medium', 'absolute top-2 left-2 text-xs font-medium text-white [text-shadow:0_1px_4px_rgb(0_0_0/0.7)]'],
    ['min-w-0 truncate rounded-full bg-foreground/[0.05] px-2.5 py-0.5 font-mono', 'min-w-0 truncate font-mono'],
    ['rounded-full bg-foreground/[0.06] px-2.5 py-1 text-xs text-muted-foreground tabular-nums', 'text-xs text-muted-foreground tabular-nums'],
    ['mx-auto flex items-center gap-2 rounded-full bg-foreground/[0.05] px-3 py-1.5', 'mx-auto flex items-center gap-2 px-3 py-1.5'],
    ['absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-negative px-1.5 text-[0.6875rem] font-semibold text-white tabular-nums', 'absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center px-1.5 text-xs font-semibold text-negative tabular-nums'],
    ['<p className="truncate text-sm">{item.label}</p>', '<p className="line-clamp-2 text-sm">{item.label}</p>'],
    ["<div className=\"flex items-center gap-3 rounded-xl px-2 py-2.5\">\n                          <div className=\"min-w-0 flex-1\">", "<div className=\"flex flex-col gap-2 rounded-xl px-2 py-2.5\">\n                          <div className=\"min-w-0\">"],
    ["<p className=\"truncate text-xs text-muted-foreground\">\n                                {item.detail}", "<p className=\"line-clamp-2 text-xs text-muted-foreground\">\n                                {item.detail}"],
    ["                          {item.editable && (\n                            <div\n                              role=\"group\"", "                          <div className=\"flex items-center gap-3\">\n                          {item.editable && (\n                            <div\n                              role=\"group\""],
    ["<span className=\"w-20 text-right font-mono text-[0.8125rem] tabular-nums\">", "<span className=\"ml-auto text-right font-mono text-[0.8125rem] tabular-nums\">"],
    ["                              onClick={() => update(item.id, null)}\n                            />\n                          )}\n                        </div>", "                              onClick={() => update(item.id, null)}\n                            />\n                          )}\n                          </div>\n                        </div>"],
  ];
  for (const [from, to] of PLAIN) src = src.split(from).join(to);
  src = src.replace(/oklch\(([\d.]+) [\d.]+ 286/g, 'oklch($1 0 0'); // neutral greys instead of a violet-tinted 286 hue
  src = src.replace(/text-\[(0?\.\d+)rem\]/g, (m, n) => (parseFloat(n) < 0.75 ? 'text-[0.75rem]' : m)); // 12px floor
  src = src.replace(/(\(n \* 31 \+ c\.charCodeAt\(0\)\) % )360/, '$1240'); // source-list favicon hue stays under 240
  return src;
}
const STATUS = `import { cn } from "@/lib/utils";
export type StatusTone = "neutral" | "brand" | "positive" | "negative" | "warning";
const dot: Record<StatusTone, string> = { neutral: "bg-muted-foreground", brand: "bg-brand", positive: "bg-positive", negative: "bg-negative", warning: "bg-warning" };
export type StatusPillProps = React.ComponentProps<"span"> & { tone?: StatusTone; size?: "sm" | "md"; icon?: unknown; iconWeight?: "fill" | "bold" };
/** House rule: no pills. A status is a dot plus text; the tone only colours the dot. */
export function StatusPill({ tone = "neutral", size = "md", icon: _icon, iconWeight: _weight, className, children, ...props }: StatusPillProps) {
  return (
    <span className={cn("inline-flex shrink-0 items-center gap-1.5 text-xs font-medium whitespace-nowrap", tone === "neutral" ? "text-muted-foreground" : "text-foreground", className)} {...props}>
      <span aria-hidden="true" className={cn("size-1.5 shrink-0 rounded-full", dot[tone])} />
      {children}
    </span>
  );
}
/** Plain mono text for identifiers (transports, models, branches). */
export function Tag({ className, ...props }: React.ComponentProps<"span">) {
  return <span className={cn("shrink-0 font-mono text-xs text-muted-foreground", className)} {...props} />;
}
`;
const CN = `type ClassValue = string | number | null | false | undefined | ClassValue[] | Record<string, unknown>;
const GROUPS: [string, RegExp][] = [
  ['w', /^w-/], ['h', /^h-/], ['size', /^size-/], ['minw', /^min-w-/], ['minh', /^min-h-/], ['maxw', /^max-w-/], ['maxh', /^max-h-/],
  ['p', /^p-/], ['px', /^px-/], ['py', /^py-/], ['pt', /^pt-/], ['pr', /^pr-/], ['pb', /^pb-/], ['pl', /^pl-/],
  ['m', /^-?m-/], ['mx', /^-?mx-/], ['my', /^-?my-/], ['mt', /^-?mt-/], ['mr', /^-?mr-/], ['mb', /^-?mb-/], ['ml', /^-?ml-/],
  ['gap', /^gap-/], ['gapx', /^gap-x-/], ['gapy', /^gap-y-/], ['rounded', /^rounded(-|$)/], ['font', /^font-(thin|light|normal|medium|semibold|bold)/],
  ['textsize', /^text-(xs|sm|base|lg|xl|\\dxl|\\[[\\d.]+(rem|px)\\])/], ['leading', /^leading-/], ['tracking', /^tracking-/], ['opacity', /^opacity-/],
  ['z', /^z-/], ['shadow', /^shadow-/], ['overflow', /^overflow-/], ['display', /^(flex|grid|block|inline-flex|inline-block|hidden|inline)$/],
  ['justify', /^justify-/], ['items', /^items-/], ['pos', /^(absolute|relative|fixed|sticky)$/], ['inset', /^inset-/],
];
const flat = (v: ClassValue, out: string[]) => { if (!v) return; if (typeof v === 'string' || typeof v === 'number') out.push(...String(v).split(/\\s+/).filter(Boolean)); else if (Array.isArray(v)) v.forEach(x => flat(x, out)); else for (const k in v) if ((v as Record<string, unknown>)[k]) out.push(...k.split(/\\s+/).filter(Boolean)); };
function keyOf(cls: string) {
  const at = cls.lastIndexOf(':'), variants = at < 0 ? '' : cls.slice(0, at + 1), rest = (at < 0 ? cls : cls.slice(at + 1)).replace(/^!/, '');
  for (const [group, test] of GROUPS) if (test.test(rest)) return variants + group;
  if (/^(bg|text)-/.test(rest) && !/^(bg-(none|gradient|clip|origin|\\(image)|text-(left|right|center|balance|pretty|wrap|nowrap|ellipsis|clip))/.test(rest)) return variants + rest.split('-')[0] + 'color';
  return null;
}
/** clsx plus a later-wins merge for the common Tailwind groups (the real tailwind-merge isn't importable here). */
export function cn(...inputs: ClassValue[]) {
  const list: string[] = []; flat(inputs, list);
  const last = new Map<string, number>(); list.forEach((cls, i) => { const key = keyOf(cls); if (key) last.set(key, i); });
  return list.filter((cls, i) => { const key = keyOf(cls); return !key || last.get(key) === i; }).join(' ');
}
`;
const files = new Set(readdirSync(`${ASSETS}/fill`)), byFlat = new Map();
for (const f of files) { const base = f.replace(/-fill\.svg$/, ''); byFlat.set(base.replaceAll('-', ''), base); }
const svgInner = path => readFileSync(path, 'utf8').replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
function phosphorModule(names) {
  const entries = [];
  for (const name of names) {
    const base = byFlat.get(name.toLowerCase());
    if (!base) throw new Error(`No Phosphor icon for ${name}`);
    const w = {}; for (const weight of ['fill', 'bold', 'regular']) w[weight] = svgInner(`${ASSETS}/${weight}/${base}${weight === 'regular' ? '' : '-' + weight}.svg`);
    entries.push([name, w]);
  }
  return { entries, text: wrapIcons(entries) };
}
function wrapIcons(entries) {
  return `import { forwardRef, type ComponentType, type SVGProps } from "react";
export type IconWeight = "thin" | "light" | "regular" | "bold" | "fill" | "duotone";
export type IconProps = Omit<SVGProps<SVGSVGElement>, "ref"> & { weight?: IconWeight; size?: number | string; color?: string; mirrored?: boolean };
export type Icon = ComponentType<IconProps>;
const PATHS: Record<string, Partial<Record<IconWeight, string>>> = ${JSON.stringify(Object.fromEntries(entries.map(([n, w]) => [n, w])))};
function make(name: string, displayName: string): Icon {
  const Component = forwardRef<SVGSVGElement, IconProps>(({ weight = "regular", size = "1em", color = "currentColor", mirrored, children, ...rest }, ref) => {
    const set = PATHS[name], body = set[weight] ?? set.regular ?? set.fill ?? "";
    return <svg ref={ref} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width={size} height={size} fill={color} transform={mirrored ? "scale(-1, 1)" : undefined} {...rest}><g dangerouslySetInnerHTML={{ __html: body }} />{children}</svg>;
  });
  Component.displayName = displayName; return Component;
}
${entries.map(([n]) => `export const ${n} = make("${n}", "${n}");`).join('\n')}
`;
}

/* ---------- radix shim: portals render in place so the @scope sheet still reaches them ---------- */
const RADIX = `import * as PopoverNs from "@radix-ui/react-popover";
import * as SelectNs from "@radix-ui/react-select";
import * as DialogNs from "@radix-ui/react-dialog";
import * as DropdownMenuNs from "@radix-ui/react-dropdown-menu";
import * as ContextMenuNs from "@radix-ui/react-context-menu";
const inPlace = <T extends object>(ns: T): T => ({ ...ns, Portal: ({ children }: { children?: React.ReactNode }) => <>{children}</> });
export const Popover = inPlace(PopoverNs), Select = inPlace(SelectNs), Dialog = inPlace(DialogNs), DropdownMenu = inPlace(DropdownMenuNs), ContextMenu = inPlace(ContextMenuNs);
`;


export { rules, STATUS, phosphorModule, RADIX };
