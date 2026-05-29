import fs from 'fs';
const f = 'src/index.js';
let content = fs.readFileSync(f, 'utf-8');
if (content.includes("import ora from 'ora';")) { console.log('Already present'); process.exit(0); }
// handle both \n and \r\n
content = content.replace(
  /import readline from 'readline';\r?\n/,
  "import readline from 'readline';\nimport ora from 'ora';\n"
);
fs.writeFileSync(f, content);
console.log('Done: ora import added');
