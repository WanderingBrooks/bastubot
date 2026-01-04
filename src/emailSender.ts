import nodemailer from 'nodemailer';

import log, { fullRunLog } from './log';
import { AvailableSlots, Slot, Week } from './types';

const { EMAIL_SERVICE, EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASSWORD } =
  process.env;

if (
  !EMAIL_SERVICE ||
  !EMAIL_HOST ||
  !EMAIL_PORT ||
  !EMAIL_USER ||
  !EMAIL_PASSWORD
) {
  throw new Error(
    `Misconfigured email settings: ${JSON.stringify(
      {
        EMAIL_SERVICE,
        EMAIL_HOST,
        EMAIL_PORT,
        EMAIL_USER,
        EMAIL_PASSWORD,
      },
      null,
      2,
    )}`,
  );
}

const emailPortAsNumber = Number.parseInt(EMAIL_PORT, 10);

if (Number.isNaN(emailPortAsNumber)) {
  throw new Error('EMAIL_PORT must be a parseable number');
}

const transporter = nodemailer.createTransport({
  service: EMAIL_SERVICE,
  host: EMAIL_HOST,
  port: emailPortAsNumber,
  secure: true,
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASSWORD,
  },
});

const mailOptions = {
  from: EMAIL_USER,
  to: EMAIL_USER,
};

const daysOfTheWeek = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];

const getHeader = ({ week }: { week: Week }) => {
  if (week === 'thisWeek') {
    return `Sauna slot available this week!`;
  }

  if (week === 'nextWeek') {
    return `Sauna slot available next week!`;
  }

  return `Got a weird week in [getHeader]: "${week}"`;
};

const getLogHeader = ({ week }: { week: Week }) => {
  if (week === 'thisWeek') {
    return `This week check log`;
  }

  if (week === 'nextWeek') {
    return `Next week check log`;
  }

  return `Got a weird week in [getLogHeader]: "${week}"`;
};

const prepareSlotsForEmail = ({
  openSixOrEightSlots,
}: {
  openSixOrEightSlots: AvailableSlots;
}) =>
  Object.keys(openSixOrEightSlots).reduce((aggregatedText, day) => {
    const keyAsNumber = Number.parseInt(day, 10);
    const dayOfTheWeek = daysOfTheWeek[keyAsNumber];
    const availableTimes = openSixOrEightSlots[keyAsNumber]
      ?.map((slot) => slot.time)
      ?.join(', ');

    const newMessage = `${dayOfTheWeek}: [${availableTimes}]`;

    return `${aggregatedText}${newMessage}\n`;
  }, '');

const alertSaunaAvailability = ({
  week,
  openSixOrEightSlots,
}: {
  week: Week;
  openSixOrEightSlots: AvailableSlots;
}) => {
  log(
    `Preparing to send email with slots: ${JSON.stringify(openSixOrEightSlots, null, 2)}`,
  );

  const message = prepareSlotsForEmail({ openSixOrEightSlots });

  log(`Sending email alerting sauna is available: "${message}"`);

  return transporter
    .sendMail({ ...mailOptions, text: message, subject: getHeader({ week }) })
    .then((result) => {
      log('Successfully sent email');

      return result;
    });
};

const alertUserBookingToday = ({
  slotsUserHasBookedToday,
}: {
  slotsUserHasBookedToday: Slot[];
}) => {
  const timesUserHasBookedToday = slotsUserHasBookedToday
    .map((slot) => slot.time)
    .join(', ');

  log(
    `Preparing to send email alerting user has booking today for slot: ${timesUserHasBookedToday}`,
  );

  return transporter
    .sendMail({
      ...mailOptions,
      text: `You have a booking today (${timesUserHasBookedToday})`,
      subject: `Sauna Booking Alert Today - ${timesUserHasBookedToday}`,
    })
    .then((result) => {
      log('Successfully sent email');

      return result;
    });
};

const sendRunLog = ({ week }: { week: Week }) =>
  transporter.sendMail({
    ...mailOptions,
    text: fullRunLog,
    subject: getLogHeader({ week }),
  });

export { alertSaunaAvailability, alertUserBookingToday, sendRunLog };
