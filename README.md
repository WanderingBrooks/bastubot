# bastubot 🧖🗓️

Bastu (Swedish for sauna).

A small TypeScript job that checks an apartment building's sauna booking calendar in the Aptus portal (by Säkerhetsintegrering) and emails you when an evening slot opens up.

Each run:

1. Logs in and fetches this week's and next week's calendar.
2. Emails you any 18:00–20:00 or 20:00–22:00 slot that's open now but wasn't on the last run.
3. On the first run of the day, emails you a reminder if you have the sauna booked today.

It runs once and exits, non-zero on failure. Scheduling it is up to whatever runs it. In production that's a systemd timer running the Docker image, see [homelab-docker-compose](https://github.com/WanderingBrooks/homelab-docker-compose).

## Setup

1. `nvm use`
2. `npm install`
3. Copy `.env.example` to `.env` and fill it in.

## Run

`npm run dev` builds and runs once, reading `.env`. State is kept in `state.json` (in the repo root unless `STATE_DIR` is set).

Deleting `state.json` makes the next run treat every open slot as new.

## Docker

```
docker build -t bastubot:latest .
docker run --rm --env-file .env bastubot:latest
```

## Email sending

Alerts are sent from a Gmail account to itself, using an [app password](https://myaccount.google.com/apppasswords).
