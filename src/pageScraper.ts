import puppeteer, { Page } from 'puppeteer';

import log from './log';
import { config } from './config';
import { Day, Week } from './types';

const { email, password, loginUrl, saunaUrl, headlessChromiumPath } =
  config.sauna;

const weeks: Week[] = ['thisWeek', 'nextWeek'];

/**
 * Get current day of the week as 0 (Monday) to 6 (Sunday)
 */
const getCurrentDayOfTheWeek = () => (new Date().getDay() + 6) % 7;

const getDateToCheck = ({ week }: { week: Week }) => {
  if (week === 'thisWeek') {
    return new Date().toISOString().split('T')[0];
  }

  if (week === 'nextWeek') {
    const nextWeekMonday = new Date();

    const currentDay = getCurrentDayOfTheWeek();

    nextWeekMonday.setDate(
      // Add to the current date 7 - the current day of the week
      // so that we get into the next week
      nextWeekMonday.getDate() + (7 - currentDay),
    );

    return nextWeekMonday.toISOString().split('T')[0];
  }

  throw new Error(`Unspported week type: "${week}"`);
};

const scrapeWeek = async ({ page, week }: { page: Page; week: Week }) => {
  const dateToCheck = getDateToCheck({ week });

  // Navigate to the sauna booking page
  await page.goto(`${saunaUrl}&passDate=${dateToCheck}`);
  log(`Navigated to sauna url with date: "${dateToCheck}"`);

  const slotStatuses = await page.evaluate(() => {
    const dayColumns = document.querySelectorAll('.dayColumn');

    const statusPerSlot = Array.from(dayColumns).reduce<Day[]>(
      (reduced, column) => {
        const children = column?.children;

        const slotsWithStatus = Array.from(children)
          // Filter our non timeslot items
          .filter((child) => child.classList.contains('interval'))
          .map((child) => ({
            isBookedByCurrentUser: child.classList.contains('own'),
            isAvailable: child.classList.contains('bookable'),
            time: (
              Array.from(child?.children)?.[0] as HTMLElement
            )?.innerText?.replace('\n', ''),
          }))
          .filter((slot) => slot.time);

        return [...reduced, slotsWithStatus];
      },
      [],
    );

    return statusPerSlot;
  });

  log(`extracted for "${week}": ${JSON.stringify(slotStatuses, null, 2)}`);

  return {
    slots: slotStatuses,
    dayOfTheWeek: getCurrentDayOfTheWeek(),
  };
};

type SaunaStatuses = Awaited<ReturnType<typeof scrapeWeek>>;

const checkSaunaAvailability = async () => {
  log(
    headlessChromiumPath
      ? `Launching headless Chromium at "${headlessChromiumPath}"`
      : 'Launching non-headless Chromium (HEADLESS_CHROMIUM_PATH not set)',
  );

  // Launch the browser and open a new blank page
  const browser = await puppeteer.launch(
    headlessChromiumPath
      ? {
          headless: true,
          executablePath: headlessChromiumPath,
          args: ['--no-sandbox', '--disable-setuid-sandbox'],
        }
      : {
          headless: false,
        },
  );

  log('Launched browser');

  const page = await browser.newPage();

  try {
    log('Opened new page');

    // Go to login page
    // Navigate the page to a URL
    await page.goto(loginUrl);

    log('Navigated to login url');

    // Type the username and password
    await page.type('#UserName', email);

    log('Filled username');

    await page.type('#Password', password);

    log('Filled password');

    // Click the login button
    await page.click('#btnLogin');

    log('Clicked login');

    // Wait for the login to succeed
    await page.waitForSelector('.navigationElement');

    log('Menu appeared after login');

    const statusesByWeek = {} as Record<Week, SaunaStatuses>;

    for (const week of weeks) {
      statusesByWeek[week] = await scrapeWeek({ page, week });
    }

    return statusesByWeek;
  } catch (error) {
    log(`Error occurred during sauna availability check: ${error}`);

    throw error;
  } finally {
    await browser.close();

    log(`Closed browser`);
  }
};

export { checkSaunaAvailability };

export type { SaunaStatuses };
