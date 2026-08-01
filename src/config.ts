import 'dotenv/config';

interface Config {
  sauna: {
    email: string;
    password: string;
    loginUrl: string;
    saunaUrl: string;
    headlessChromiumPath?: string;
  };
  email: {
    service: string;
    host: string;
    port: number;
    user: string;
    password: string;
  };
}

const {
  EMAIL,
  PASSWORD,
  LOGIN_URL,
  SAUNA_URL,
  HEADLESS_CHROMIUM_PATH,
  EMAIL_SERVICE,
  EMAIL_HOST,
  EMAIL_PORT,
  EMAIL_USER,
  EMAIL_PASSWORD,
} = process.env;

if (!EMAIL) {
  throw new Error('EMAIL is required: Set your Aptus login email in .env');
}

if (!PASSWORD) {
  throw new Error(
    'PASSWORD is required: Set your Aptus login password in .env',
  );
}

if (!LOGIN_URL) {
  throw new Error('LOGIN_URL is required: Set the Aptus login URL in .env');
}

if (!SAUNA_URL) {
  throw new Error('SAUNA_URL is required: Set the sauna booking URL in .env');
}

if (!EMAIL_SERVICE) {
  throw new Error(
    'EMAIL_SERVICE is required: Set the email service (e.g., gmail) in .env',
  );
}

if (!EMAIL_HOST) {
  throw new Error('EMAIL_HOST is required: Set the SMTP host in .env');
}

if (!EMAIL_PORT) {
  throw new Error(
    'EMAIL_PORT is required: Set the SMTP port as a number in .env',
  );
}

if (!EMAIL_USER) {
  throw new Error('EMAIL_USER is required: Set the email address in .env');
}

if (!EMAIL_PASSWORD) {
  throw new Error('EMAIL_PASSWORD is required: Set the email password in .env');
}

const port = parseInt(EMAIL_PORT, 10);

if (isNaN(port)) {
  throw new Error('EMAIL_PORT must be a valid number');
}

export const config: Config = {
  sauna: {
    email: EMAIL,
    password: PASSWORD,
    loginUrl: LOGIN_URL,
    saunaUrl: SAUNA_URL,
    headlessChromiumPath: HEADLESS_CHROMIUM_PATH,
  },
  email: {
    service: EMAIL_SERVICE,
    host: EMAIL_HOST,
    port,
    user: EMAIL_USER,
    password: EMAIL_PASSWORD,
  },
};
