import log, { setupLogger } from './log';
import run from './runner';
import { Week } from './types';
import './config'; // Import to validate env vars early

const [rawWeek] = process.argv.slice(2);

let week: Week | null = null;

if (rawWeek === 'thisWeek') {
  week = 'thisWeek';
}

if (rawWeek === 'nextWeek') {
  week = 'nextWeek';
}

if (!week) {
  throw new Error(
    `Week argument must either be "thisWeek" or "nextWeek" but script was passed in "${rawWeek}"`,
  );
}

setupLogger(week);

run({ week })
  .then(() => process.exit(0))
  .catch((error) => {
    log(
      `Error running bastubot: ${JSON.stringify({
        week,
        error: error instanceof Error ? error.stack ?? error.message : error,
      })}`,
    );
    process.exit(1);
  });
