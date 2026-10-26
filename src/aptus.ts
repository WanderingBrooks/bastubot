import { parse } from 'node-html-parser';

import { config } from './config';
import { addDays, mondayOf } from './dates';

export type Slot = {
  date: string; // YYYY-MM-DD
  time: string; // e.g. "18:00 - 20:00"
  isAvailable: boolean;
  isBookedByMe: boolean;
};

const { username, password, saunaUrl, loginUrl } = config.aptus;

// Just enough of a cookie jar to carry the session between requests. fetch
// follows redirects on its own but drops the cookies set along the way, so
// redirects are followed by hand here.
const cookies = new Map<string, string>();

const request = async (
  url: string | URL,
  init: RequestInit = {},
  redirects = 0,
): Promise<Response> => {
  const response = await fetch(url, {
    ...init,
    redirect: 'manual',
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

export const login = async () => {
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

  if (!cookies.has('.ASPXAUTH')) {
    throw new Error('Login failed, check APTUS_USERNAME and APTUS_PASSWORD');
  }
};

/**
 * Every slot in the Monday-Sunday week that contains `date` (YYYY-MM-DD)
 */
export const getWeek = async (date: string): Promise<Slot[]> => {
  const url = new URL(saunaUrl);
  url.searchParams.set('passDate', date);

  const page = parse(await (await request(url)).text());
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
