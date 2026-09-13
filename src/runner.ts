import { checkSaunaAvailability, SaunaStatuses } from './pageScraper';
import { alertSaunaAvailability, alertUserBookingToday } from './emailSender';
import {
  getPreviousRunFileAndSaveNewContents,
  compareResultWithPreviousRun,
} from './previousRunCheck';
import { Week, AvailableSlots, weeks } from './types';
import log from './log';

const getOpenSlots = (slotStatuses: SaunaStatuses) => {
  return slotStatuses.slots.reduce<AvailableSlots>((reduced, day, index) => {
    const openSixOrEightSlotsInDay = day.filter(
      (slot) =>
        slot.isAvailable &&
        ['18:00 - 20:00', '20:00 - 22:00'].includes(slot.time),
    );

    if (
      Array.isArray(openSixOrEightSlotsInDay) &&
      openSixOrEightSlotsInDay.length > 0
    ) {
      return {
        ...reduced,
        [index]: openSixOrEightSlotsInDay,
      };
    }

    return reduced;
  }, {});
};

const processWeek = async ({
  week,
  slotStatuses,
}: {
  week: Week;
  slotStatuses: SaunaStatuses;
}) => {
  log(`Processing results for week: "${week}"`);

  const previousRun = await getPreviousRunFileAndSaveNewContents({
    week,
    slotStatuses,
  });

  if (
    // At the start of each day on the first check of the new day,
    // Look to see if the user has booked a slot today
    // and alert them if they have
    week === 'thisWeek' &&
    previousRun &&
    slotStatuses.dayOfTheWeek !== previousRun.dayOfTheWeek
  ) {
    const slotsUserHasBookedToday = slotStatuses.slots[
      slotStatuses.dayOfTheWeek
    ].filter((slot) => slot.isBookedByCurrentUser);

    if (slotsUserHasBookedToday.length > 0) {
      log(
        `User has bookings today (${slotStatuses.dayOfTheWeek}), alerting them.`,
      );

      await alertUserBookingToday({
        slotsUserHasBookedToday,
      });
    }
  }

  // Get all open slots for 18:00-20:00 and 20:00-22:00
  const openSixOrEightSlots = getOpenSlots(slotStatuses);

  // Get all open slots for 18:00-20:00 and 20:00-22:00 in previous run
  const openSixOrEightSlotsInPreviousRun =
    previousRun && getOpenSlots(previousRun);

  // Filter out any slots we knew about before.
  const slotsFilteredByPreviousRun = await compareResultWithPreviousRun({
    openSixOrEightSlots,
    openSixOrEightSlotsInPreviousRun,
  });

  // If there are any new slots to alert about, email the user
  // letting know there is an available slot.
  if (Object.keys(slotsFilteredByPreviousRun).length > 0) {
    await alertSaunaAvailability({
      week,
      openSixOrEightSlots: slotsFilteredByPreviousRun,
    });
  } else {
    log('Ending process, nothing to alert');
  }
};

const run = async () => {
  const statusesByWeek = await checkSaunaAvailability();

  for (const week of weeks) {
    await processWeek({ week, slotStatuses: statusesByWeek[week] });
  }
};

export default run;
