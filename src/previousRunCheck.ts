import path from 'path';
import { readJsonFile, writeJsonFile } from './utils';

import { Week, AvailableSlots } from './types';
import { log } from 'console';
import { SaunaStatuses } from './pageScraper';

const getPreviousRunFileAndSaveNewContents = async ({
  week,
  slotStatuses,
}: {
  week: Week;
  slotStatuses: SaunaStatuses;
}) => {
  const previousRunFilePath = path.resolve(
    __dirname,
    `../${week}-previousRun.json`,
  );

  const previousRun = (await readJsonFile(
    previousRunFilePath,
  )) as SaunaStatuses | null;

  // Update previous run json with the current result
  await writeJsonFile(
    previousRunFilePath,
    JSON.stringify(slotStatuses, null, 2),
  );

  return previousRun;
};

const compareResultWithPreviousRun = async ({
  openSixOrEightSlots,
  openSixOrEightSlotsInPreviousRun,
}: {
  openSixOrEightSlots: AvailableSlots;
  openSixOrEightSlotsInPreviousRun: AvailableSlots | null;
}) => {
  log(
    `Comparing previous run against current open slots: ${JSON.stringify(openSixOrEightSlots, null, 2)}`,
  );

  if (!openSixOrEightSlotsInPreviousRun) {
    log('No previous run found');

    return openSixOrEightSlots;
  }

  log(
    `Found previous run with contents: ${JSON.stringify(openSixOrEightSlotsInPreviousRun, null, 2)}`,
  );

  return Object.keys(openSixOrEightSlots).reduce<AvailableSlots>(
    (slotsThatHaveNotBeenAlertedYet, dayOfTheWeekString) => {
      const dayOfTheWeek = Number.parseInt(dayOfTheWeekString, 10);

      const slotsInWeek = openSixOrEightSlots[dayOfTheWeek];
      const slotsInWeekPreviousRun =
        openSixOrEightSlotsInPreviousRun[dayOfTheWeek];

      if (!Array.isArray(slotsInWeek)) {
        return slotsThatHaveNotBeenAlertedYet;
      }

      // Keep slots that were available now but not avaialabe before.
      const slotsToKeep = slotsInWeek.filter((slot) => {
        const slotInPreviousWeek = slotsInWeekPreviousRun?.find(
          (slotInPreviousRun) => slotInPreviousRun.time === slot.time,
        );

        // If the slot was in the previous object it means it was bookable
        return !slotInPreviousWeek;
      });

      if (slotsToKeep.length > 0) {
        return {
          ...slotsThatHaveNotBeenAlertedYet,
          [dayOfTheWeekString]: slotsToKeep,
        };
      }

      return slotsThatHaveNotBeenAlertedYet;
    },
    {},
  );
};

export { compareResultWithPreviousRun, getPreviousRunFileAndSaveNewContents };
