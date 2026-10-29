import fs from 'node:fs';

import { config } from './config';
import { getWeek, login, Slot } from './bookingSite';
import { addDays, today } from './dates';
import { sendBookingReminder, sendNewSlots } from './email';

const WATCHED_TIMES = ['18:00 - 20:00', '20:00 - 22:00'];

type State = {
  // Watched slots that were open on the last run, as "date time" keys
  openLastRun: string[];
  // The last day the booking reminder was checked for
  lastReminderDate?: string;
};

const readState = (): State => {
  if (!fs.existsSync(config.stateFile)) {
    console.log(`No state at ${config.stateFile}, starting fresh`);

    return { openLastRun: [] };
  }

  return JSON.parse(fs.readFileSync(config.stateFile, 'utf-8'));
};

const key = (slot: Slot) => `${slot.date} ${slot.time}`;

const main = async () => {
  const state = readState();
  const date = today();

  await login();
  console.log('Logged in');

  const slots = [
    ...(await getWeek(date)),
    ...(await getWeek(addDays(date, 7))),
  ];
  console.log(`Fetched ${slots.length} slots`);

  const open = slots.filter(
    (slot) =>
      slot.isAvailable &&
      slot.date >= date &&
      WATCHED_TIMES.includes(slot.time),
  );
  // Open now but not last run. A slot that gets taken and freed up again
  // counts as new again.
  const newlyOpen = open.filter(
    (slot) => !state.openLastRun.includes(key(slot)),
  );
  console.log(`${open.length} watched slots open, ${newlyOpen.length} new`);

  if (newlyOpen.length > 0) {
    await sendNewSlots(newlyOpen);
  }

  // Once a day, on the first run, remind about anything booked for today
  if (state.lastReminderDate !== date) {
    const bookedToday = slots.filter(
      (slot) => slot.date === date && slot.isBookedByMe,
    );

    if (bookedToday.length > 0) {
      await sendBookingReminder(bookedToday);
    }
  }

  // Saved only after the emails went out, so a failed send is retried on the
  // next run instead of being forgotten
  const newState: State = {
    openLastRun: open.map(key),
    lastReminderDate: date,
  };
  fs.writeFileSync(config.stateFile, JSON.stringify(newState, null, 2));
};

main().catch((error) => {
  console.error(error);
  // Non-zero so the systemd unit is marked failed and monitoring alerts
  process.exitCode = 1;
});
