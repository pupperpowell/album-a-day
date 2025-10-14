# Album a day

This is a simple web app for people doing the "listen to one album a day" challenge. It consists of a login system and a calendar page with album artwork overlaid on each day.

The source for album, artist, and cover artwork is the MusicBrainz API. Cover artwork is from the coverartarchive.org API, also by MusicBrainz in collaboration with the Internet Archive.

Redis is used as the primary database for users, sessions, albums, artists, tracks, and user data. Album artwork is stored in the filesystem.

When a user looks up an album or artist, the local Redis database is searched first and returns results. If there aren't many results, the MusicBrainz API is also called. Then results are saved to the local Redis database.

## Auth

The auth is simply usernames and passwords. Passwords are hashed using Bun.password. Usernames are stored as keys in Redis.

The auth is session-based, where a session id is stored in the browser and in Redis.

## UI

There are two main components of the UI: A calendar with album covers on each day, and a panel for album information and your rating.

## Querying the MusicBrainz API

Queries for the release field will return a list of albums and a score of how relevant they are to the query.

For example: https://musicbrainz.org/ws/2/release/?query=Sagitario&fmt=json

An example return snippet:

```json
{
  "id": "75b99138-5873-4025-80e9-c06d71ea7d17",
  "release-group": { "id": "4cac4f58-d2f2-3d71-92ec-187409d71f09" },
  "title": "Sagitario",
  "artist-credit": [{ "name": "Ana Gabriel" }]
}
```

And querying for the album artwork is like this, using the id from the response:

`https://coverartarchive.org/release-group/4cac4f58-d2f2-3d71-92ec-187409d71f09/front`

## Saving user albums

All albums are saved to an "albums" table in Redis. This contains the title, the artist, and the cover art path. (Cover arts are saved to the filesystem.)

---

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
bun --bun run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!
