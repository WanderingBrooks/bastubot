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
  bookingSite: {
    username: required('SAUNA_USERNAME'),
    password: required('SAUNA_PASSWORD'),
    saunaUrl,
    // The login page is on the same site as the sauna calendar
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
