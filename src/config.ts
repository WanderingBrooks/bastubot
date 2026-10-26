import path from 'node:path';

const required = (name: string) => {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is required, see .env.example`);
  }

  return value;
};

const saunaUrl = required('SAUNA_URL');

export const config = {
  aptus: {
    username: required('APTUS_USERNAME'),
    password: required('APTUS_PASSWORD'),
    saunaUrl,
    // The login page lives on the same portal as the sauna calendar
    // (.../AptusPortal/CustomerBooking/BookingCalendar -> .../AptusPortal/Account/Login)
    loginUrl: new URL('../Account/Login', saunaUrl).toString(),
  },
  gmail: {
    user: required('GMAIL_USER'),
    appPassword: required('GMAIL_APP_PASSWORD'),
  },
  stateFile: path.join(
    process.env.STATE_DIR ?? path.resolve(__dirname, '..'),
    'state.json',
  ),
};
