//#region @notForNpm
import { Helpers } from './lib/index';
import { child_process } from './lib/index';

try {
  const out = child_process
    .execSync('where taon', { stdio: ['ignore', 'pipe', 'ignore'] })
    ?.toString();
  console.log({
    out,
  });
} catch (error) {
  console.log({
    error,
  });
}
//#endregion
