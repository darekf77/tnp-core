// scripts/generate-lodash-namespace.ts
import fs from 'fs';
import path from 'path';

const lodashEntry = require.resolve('lodash-es/lodash.js');
const content = fs.readFileSync(lodashEntry, 'utf8');

/**
 * Matches:
 * export { default as first } from './first.js';
 */
const exportRegex =
  /export\s+\{\s*default\s+as\s+([a-zA-Z0-9_$]+)\s*\}\s+from\s+['"]\.\/[^'"]+['"];/g;

const names = new Set<string>();
let match: RegExpExecArray | null;

while ((match = exportRegex.exec(content))) {
  names.add(match[1]);
}

// OPTIONAL: filter out wrapper / chain stuff if you want
const blacklist = new Set([
  'lodash',
  'wrapperLodash',
  'wrapperChain',
  'wrapperCommit',
  'wrapperNext',
  'wrapperPlant',
  'wrapperReverse',
  'wrapperValue',
  'commit',
  'next',
  'plant',
  'toIterator',
  'value',
  'valueOf',
  'wrapperAt',
  'wrapperToIterator',
  'toJSON',
]);

const exports = [...names].filter(n => !blacklist.has(n)).sort();

// --- generate code ---

const imports = exports.map(n => `import  * as _${n} from 'lodash/${n}';`).join('\n');

const namespaceBody = exports
  .map(n => `  export const ${n} = ((_${n} as any)?.default ?? _${n}) as typeof lodash.${n};`)
  .join('\n');

const output =
  `// @ts-nocheck
// AUTO-GENERATED FILE — DO NOT EDIT
// Source: lodash-es/lodash.js
import type * as lodash from 'lodash';
${imports}


export namespace _ {
${namespaceBody}
}
`.trim() + '\n';

const outFile = path.resolve('src/lib/lodash.namespace.ts');
fs.writeFileSync(outFile, output);

console.log(
  `✔ lodash namespace generated (${exports.length} functions) → ${outFile}`,
);
