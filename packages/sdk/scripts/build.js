/**
 * Build script — produces dist/yoxperience.js (minified) and dist/yoxperience.full.js (readable)
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(resolve(__dirname, '../src/yoxperience.js'), 'utf-8');

mkdirSync(resolve(__dirname, '../dist'), { recursive: true });

// Full version (copy)
writeFileSync(resolve(__dirname, '../dist/yoxperience.full.js'), src);

// Minified version — simple minification (remove comments, extra whitespace)
const minified = src
  .replace(/\/\*[\s\S]*?\*\//g, '')            // block comments
  .replace(/\/\/.*$/gm, '')                     // line comments
  .replace(/\n\s*\n/g, '\n')                    // blank lines
  .replace(/^(\s{2,})/gm, ' ')                  // leading whitespace
  .replace(/\s{2,}/g, ' ')                      // collapse whitespace
  .replace(/\n/g, '')                           // remove newlines
  .replace(/;}/g, '}')                          // remove empty braces
  .replace(/\s*([{}();,:])\s*/g, '$1');         // tighten around symbols

writeFileSync(resolve(__dirname, '../dist/yoxperience.js'), minified);

const srcBytes = Buffer.byteLength(src, 'utf-8');
const minBytes = Buffer.byteLength(minified, 'utf-8');
console.log(`yoxperience.js: ${srcBytes} bytes → ${minBytes} bytes (${Math.round((1 - minBytes / srcBytes) * 100)}% reduction)`);
