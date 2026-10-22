import { translations } from './translations/index.js';

const [baseCode, ...otherCodes] = Object.keys(translations);
const base = Object.keys(translations[baseCode]).sort();
let failed = false;
for (const code of otherCodes) {
  const current = Object.keys(translations[code]).sort();
  const missing = base.filter((key) => !current.includes(key));
  const extra = current.filter((key) => !base.includes(key));
  if (missing.length || extra.length) {
    failed = true;
    console.error(`${code}: missing [${missing.join(', ')}], extra [${extra.join(', ')}]`);
  }
}
if (failed) process.exit(1);
console.log(`Translation check passed: ${Object.keys(translations).join(', ')} have ${base.length} matching keys.`);
