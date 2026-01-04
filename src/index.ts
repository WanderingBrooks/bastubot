import run from './runner';
import { Week } from './types';

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

run({ week }).then(() => process.exit(0));
