# bastubot 🧖🗓️

Bastu (Swedish for sauna).

A small TypeScript utility that automatically checks your apartment building’s sauna booking calendar for any available slots in the next two weeks. This utility is written for the Aptus app provided by Säkerhetsintergrering.

If a slot opens up, it sends you an email notification so you can book it.

The script will also check if you have any current bookings. If so the day of your booking a reminder email will be sent to make sure you remember it.

This script is designed to run automatically on a Raspberry Pi using a cron job, making it a set-and-forget sauna slot watcher.

## Install

1. `nvm use`
2. `npm install`

## Environment variables

See .env.example.

## Run

1. `npm run dev` — checks both this week and next week in one run

## Build

1. `npm run build`
2. `npm run start`

## Setup on a raspberry pi

1. Install chromium `sudo apt install chromium-browser chromium-codecs-ffmpeg`
2. Install packages `npm install`
3. Build `npm run build`
4. Open crontab `crontab -e`
5. Add a line that will run this job. `* * * * * (. ~/Desktop/bastubot/cronjob.env.sh; ~/Desktop/bastubot/check.sh)`

   - Each run checks both this week and next week in a single browser
     session (one login covers both).

   - For example I currently use the following:

   ```
   0,10,20,30,40,50 7-22 * * * (. ~/Desktop/bastubot/cronjob.env.sh; ~/Desktop/bastubot/check.sh)
   ```

   - Why this schedule?
     1. Runs every 10 minutes so we get updates quickly.
     2. Limits requests to the booking app so requests don't get blocked.

6. Logs will end up in `~/logs/bastubot`

## Email sending

I currenlty use Gmail to send emails from and to the same email. This was quite easy to setup and works quite well. I followed [this guide](https://archive.ph/x3R1S).
