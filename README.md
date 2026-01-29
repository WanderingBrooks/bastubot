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

1. `npm run dev thisWeek` or `npm run dev nextWeek`

## Build

1. `npm run build`
2. `npm run start`

## Setup on a raspberry pi

1. Install chromium `sudo apt install chromium-browser chromium-codecs-ffmpeg`
2. Install packages `npm install`
3. Build `npm run build`
4. Open crontab `crontab -e`
5. Add your a line that will run this job. `* * * * * (. ~/Desktop/bastubot/cronjob.env.sh; ~/Desktop/bastubot/checkThisWeek.sh)`

   - You can control which week is checked either this week or next week by calling the corresponding script `checkThisWeek.sh` or `checkNextWeek.sh`.

   - For example I currently the following

   ```
   # Check the current week for either open slots or slots that someone skipped
   0,10,20,30,40,50 7-22 * * * (. ~/Desktop/sauna-stalker/cronjob.env.sh; ~/Desktop/sauna-stalker/checkThisWeek.sh)
   # Check next week for any slots that open
   5,15,25,35,45,55 7-22 * * * (. ~/Desktop/sauna-stalker/cronjob.env.sh; ~/Desktop/sauna-stalker/checkNextWeek.sh)sh)
   ```

   - Why this schedule?
     1. Runs every 5 minutes to check either the current week or next week. So we get updates quickly
     2. Alternates between current and next week so cover them equally.
     3. Limits requests to the booking app so requests don't get blocked.

6. Logs will end up in `~/Desktop/bastubot/file.log`

## Email sending

I currenlty use Gmail to send emails from and to the same email. This was quite easy to setup and works quite well. I followed [this guide](https://archive.ph/x3R1S).
