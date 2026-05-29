

Fix the glob import error in `src/scanner.js`. The error is: `SyntaxError: The requested module 'glob' does not provide an export named 'default'`. 

Change the import from:
```js
import glob from 'glob';
```
to:
```js
import { glob } from 'glob';
```

Then check ALL other files in `src/` for any similar default import issues with these packages: glob, node-fetch, chalk, ora, inquirer, figlet, gradient-string, boxen, fs-extra. Fix any that use incorrect default imports for ESM. After fixing, confirm all imports are ESM-compatible. Do not change any logic, only fix imports.

