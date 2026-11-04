import fs from 'node:fs';

import { parse } from 'node-html-parser';

import { config } from './config';
import { addDays, mondayOf } from './dates';

export type Slot = {
  date: string; // YYYY-MM-DD
  time: string; // e.g. "18:00 - 20:00"
  isAvailable: boolean;
  isBookedByMe: boolean;
};

const { username, password, saunaUrl, loginUrl } = config.bookingSite;

// Just enough of a cookie jar to carry the session between requests. fetch
// follows redirects on its own but drops the cookies set along the way, so
// redirects are followed by hand here.
const cookies = new Map<string, string>();

// The cookie the portal sets on a successful login
const AUTH_COOKIE = '.ASPXAUTH';

class LoggedOutError extends Error {}

const request = async (
  url: string | URL,
  init: RequestInit = {},
  redirects = 0,
): Promise<Response> => {
  const response = await fetch(url, {
    ...init,
    redirect: 'manual',
    // Without this a stalled response can hold up the run for minutes
    signal: AbortSignal.timeout(30_000),
    headers: {
      ...init.headers,
      cookie: [...cookies]
        .map(([name, value]) => `${name}=${value}`)
        .join('; '),
    },
  });

  for (const header of response.headers.getSetCookie()) {
    const [pair] = header.split(';');
    const separator = pair.indexOf('=');
    cookies.set(pair.slice(0, separator), pair.slice(separator + 1));
  }

  const location = response.headers.get('location');

  if (location && response.status >= 300 && response.status < 400) {
    // As with fetch, a caller asking for manual redirects gets the redirect
    if (init.redirect === 'manual') {
      return response;
    }

    if (redirects >= 10) {
      throw new Error(`Too many redirects, last one to ${location}`);
    }

    return request(new URL(location, url), {}, redirects + 1);
  }

  if (!response.ok) {
    throw new Error(
      `${init.method ?? 'GET'} ${url} returned ${response.status}`,
    );
  }

  return response;
};

// Mirrors the portal's pwEnc.js: the password is sent a second time with
// every character XOR'd against the salt the login form hands out
const encodePassword = (salt: number) =>
  [...password]
    .map((c) => String.fromCharCode(salt ^ c.charCodeAt(0)))
    .join('');

const attemptLogin = async () => {
  // The first visit only sets a session cookie and redirects away. The
  // second, carrying that cookie, gets the actual login form.
  await request(loginUrl);
  const form = parse(await (await request(loginUrl)).text());

  const field = (name: string) => {
    const value = form
      .querySelector(`input[name="${name}"]`)
      ?.getAttribute('value');

    if (value === undefined) {
      throw new Error(`Login form is missing the ${name} field`);
    }

    return value;
  };

  const salt = field('PasswordSalt');

  await request(loginUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      DeviceType: 'PC',
      DesktopSelected: 'true',
      __RequestVerificationToken: field('__RequestVerificationToken'),
      UserName: username,
      Password: password,
      PwEnc: encodePassword(Number(salt)),
      PasswordSalt: salt,
    }),
  });

  if (!cookies.has(AUTH_COOKIE)) {
    throw new Error('Login failed, check SAUNA_USERNAME and SAUNA_PASSWORD');
  }
};

const login = async () => {
  try {
    await attemptLogin();
  } catch (error) {
    // The portal now and then redirect-loops a fresh visitor between its
    // login and error pages. Sometimes that clears within seconds, sometimes
    // it lasts hours. A clean second attempt catches the short ones.
    console.warn('Login failed, retrying once:', error);
    cookies.clear();
    await new Promise((resolve) => setTimeout(resolve, 5000));
    await attemptLogin();
  }
};

/**
 * Runs `work` with the session saved by an earlier run, logging in only when
 * there is none or the portal has expired it. Sessions last about 90 minutes,
 * so most runs skip the login.
 */
export const withSession = async <T>(work: () => Promise<T>): Promise<T> => {
  try {
    const saved = JSON.parse(fs.readFileSync(config.sessionFile, 'utf-8'));
    Object.entries<string>(saved).forEach(([name, value]) =>
      cookies.set(name, value),
    );
  } catch {
    // No saved session yet, or an unreadable one: just log in
  }

  if (cookies.has(AUTH_COOKIE)) {
    try {
      const result = await work();
      console.log('Reused the saved session');

      return result;
    } catch (error) {
      if (!(error instanceof LoggedOutError)) {
        // Not obviously a session problem, but don't trust this session
        // again: the next run logs in fresh rather than getting stuck on it
        fs.rmSync(config.sessionFile, { force: true });
        throw error;
      }

      console.log('Saved session was rejected, logging in again');
    }
  }

  cookies.clear();
  await login();
  console.log('Logged in');
  // The file holds the auth cookie, which logs anyone who has it into
  // the account until the session expires. 0o600 (octal, like chmod 600)
  // makes it readable and writable by its owner only, where the default
  // would let every user on the machine read it. Only applies when the file
  // is created; overwriting keeps its existing permissions.
  fs.writeFileSync(
    config.sessionFile,
    JSON.stringify(Object.fromEntries(cookies)),
    { mode: 0o600 },
  );

  return work();
};

/**
 * Every slot in the Monday-Sunday week that contains `date` (YYYY-MM-DD)
 */
export const getWeek = async (date: string): Promise<Slot[]> => {
  const url = new URL(saunaUrl);
  url.searchParams.set('passDate', date);

  const response = await request(url, { redirect: 'manual' });

  // Any redirect away from the calendar means the session is no good, either
  // a clean one to log in or the start of the portal's login/error loop.
  // Checked before following it, so a loop also gets a fresh login.
  if (response.status !== 200) {
    throw new LoggedOutError(
      `Not logged in, redirected to ${response.headers.get('location')}`,
    );
  }

  const page = parse(await response.text());
  const days = page.querySelectorAll('.dayColumn');

  if (days.length !== 7) {
    throw new Error(
      `Expected 7 days on the calendar for ${date}, found ${days.length}. Logged out, or did the page change?`,
    );
  }

  const monday = mondayOf(date);

  return days.flatMap((day, index) => {
    const dayDate = addDays(monday, index);

    // The columns carry no full date, so double check the one worked out
    // from the column's position against the day of month it shows
    const dayOfMonth = Number(day.querySelector('.dayOfMonth')?.text);

    if (dayOfMonth !== Number(dayDate.slice(8))) {
      throw new Error(
        `Calendar column ${index} shows day ${dayOfMonth}, expected ${dayDate}`,
      );
    }

    return day.querySelectorAll('.interval').flatMap((interval) => {
      const text = interval.text.trim();

      // Some days have empty spacer cells (just an &nbsp;), not slots
      if (!text) {
        return [];
      }

      const time = text.match(/\d\d:\d\d - \d\d:\d\d/)?.[0];

      if (!time) {
        throw new Error(`Slot on ${dayDate} has no time: "${text}"`);
      }

      return {
        date: dayDate,
        time,
        isAvailable: interval.classList.contains('bookable'),
        isBookedByMe: interval.classList.contains('own'),
      };
    });
  });
};
