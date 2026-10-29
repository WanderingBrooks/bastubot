import nodemailer from 'nodemailer';

import { config } from './config';
import { formatDay } from './dates';
import { Slot } from './bookingSite';

const { user, appPassword } = config.gmail;

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user, pass: appPassword },
});

// Everything goes from the Gmail account to itself
const send = async (subject: string, text: string) => {
  await transporter.sendMail({ from: user, to: user, subject, text });
  console.log(`Sent email: "${subject}"`);
};

const describe = (slots: Slot[]) =>
  slots.map((slot) => `${formatDay(slot.date)}: ${slot.time}`).join('\n');

export const sendNewSlots = (slots: Slot[]) =>
  send(
    slots.length === 1 ? 'Sauna slot available!' : 'Sauna slots available!',
    describe(slots),
  );

export const sendBookingReminder = (slots: Slot[]) =>
  send(
    `Sauna booking today - ${slots.map((slot) => slot.time).join(', ')}`,
    `You have the sauna booked today:\n${describe(slots)}`,
  );
