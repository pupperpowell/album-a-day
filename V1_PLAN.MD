# Album-a-Day Project

## Overview

A daily album listening tracker where users listen to one album per day, rate it, select a favorite track, and write notes. Each user gets a profile page featuring a calendar covered in album artworks, with clickable days revealing full listening details.

## Tech Stack

- **Frontend/Backend**: Next.js (App Router)
- **Database**: Redis (with RediSearch for fuzzy search)
- **Authentication**: Username/password (stored in Redis)
- **Album Metadata**: MusicBrainz API (free, no auth required)
- **Album Artwork Storage**: Local filesystem, https://coverartarchive.org/

## Architecture

### Data Model (Redis)

**Users**

```
user:{username}
  - password: hashed_password
  - created_at: timestamp
```

**Sessions**

```
session:{session_id}
  - username: string
  - created_at: timestamp
  - expires_at: timestamp
  - user_agent: string (optional, for security)

user:sessions:{username}
  - Set of active session_ids for user
```

**Albums (cached from MusicBrainz)**

```
album:{mbid}
  - title: string
  - artist: string
  - mbid: string (MusicBrainz ID)
  - artwork_path: string (local filesystem path)
  - release_date: string
```

**Listening Entries**

```
listening:{username}:{date}
  - album_mbid: string
  - date: YYYY-MM-DD
  - rating: float (0-10)
  - favorite_track: string
  - notes: text
  - created_at: timestamp
```

**Indexes (RediSearch)**

```
FT.CREATE idx:albums
  ON HASH PREFIX 1 album:
  SCHEMA
    title TEXT SORTABLE
    artist TEXT SORTABLE
```

### Album Search Flow

1. User types album title in search box
2. Backend queries Redis with `FT.SEARCH idx:albums "@title:{query}" LIMIT 0 20`
3. If results < 5:
   - Query MusicBrainz API: `https://musicbrainz.org/ws/2/release/?query={title}&fmt=json&limit=20`
   - Filter results for `type: "album"`
   - Fetch artwork from Cover Art Archive: `https://coverartarchive.org/release/{mbid}`
   - Download artwork to `/public/artwork/{mbid}.jpg`
   - Store album metadata in Redis with artwork path
4. Return combined results (Redis + MusicBrainz) to frontend

### Authentication

Username/password with session management:

- Passwords hashed with Bun.password
- Sessions stored in Redis with TTL (e.g., 30 days)
- Session ID stored in httpOnly cookie
- Session validation on each authenticated request

**Session Flow:**

1. User logs in with username/password
2. Generate random session_id (crypto.randomUUID())
3. Store session in Redis: `SETEX session:{session_id} 2592000 {username}` (30 days TTL)
4. Add session_id to user's session set: `SADD user:sessions:{username} {session_id}`
5. Set httpOnly cookie with session_id
6. On each request, validate session exists and hasn't expired
7. On logout, delete session from Redis and remove from user's session set

## API Routes

### Authentication

- `POST /api/auth/signup` - Create new user
- `POST /api/auth/login` - Login user, create session, set cookie
- `POST /api/auth/logout` - Delete session, clear cookie
- `GET /api/auth/session` - Validate current session, return username

### Albums

- `GET /api/albums/search?q={query}` - Search albums (Redis + MusicBrainz)
- `GET /api/albums/{mbid}` - Get album details

### Listening Entries

- `POST /api/listening` - Add/update daily listening entry
- `GET /api/listening/{username}` - Get all entries for user (for calendar)
- `GET /api/listening/{username}/{date}` - Get specific day's entry
- `DELETE /api/listening/{username}/{date}` - Remove entry (for re-listening)

## Pages & Routes

### Public Pages

- `/` - Landing page ("What is this site?" and Login/Signup)
- `/{username}` - User's profile page with calendar

### Authenticated Pages

- `/dashboard` - User's own calendar view

## Feature Implementation (v1)

### 1. Calendar View

- Grid layout: 7 columns (days of week) × dynamic # of rows (weeks per month)
- Each day shows album artwork thumbnail (if listened)
- Empty days are blank
- Future days are greyed out
- Click day to open side panel

### 2. Side Panel

**Top Section:**

- Album artwork (large)
- Album title
- Artist name

**Listen Links:**

- Search links to streaming services:
  - Spotify: `https://open.spotify.com/search/{artist}%20{album}`
  - YouTube Music: `https://music.youtube.com/search?q={artist}+{album}`
  - Apple Music: `https://music.apple.com/search?term={artist}+{album}`

**User Data:**

- Rating: X.X/10 (display as stars or number)
- Favorite track: "Track Name"
- Notes: User's written thoughts (plain text)

**Actions:**

- Edit button (if own profile)
- Share button

### 3. Re-listening

- Allow deleting existing entry to mark day as "empty"
- User can then log a new album for that day
- Maintains integrity: one album per day maximum

### 4. Landing Page

**Hero Section:**

- "Listen to one album a day"
- Brief explanation of the concept
- Login/Signup forms

**How It Works:**

1. Search for an album
2. Rate it, pick favorite track, write notes
3. Track your journey on a calendar
4. Share your discoveries

### 5. Profile Pages

- URL: `https://albuma.day/{username}`
- Page title: `{username} is listening to one album a day`
- Shows public calendar of user's listening history
- Visitors can click days to see same calendar view with expandable sidebar

### 6. Share Button

**Generated Text:**

```
Album #{album_number} / {streak} 🔥: today I listened to {album.title} by {artist}
rated {rating}/10 / favorite track: "{favorite_track}"
wrote {word_count} words: https://albuma.day/{username}/{album_number}
```

**Implementation:**

- Generate share text dynamically
- Copy to clipboard on click
- Calculate streak: consecutive days with entries
- Count: total albums listened to
- Word count: split notes by whitespace

**Rich Link Preview (OpenGraph meta tags):**

```html
<meta property="og:title" content="{username}'s listening: {album.title}" />
<meta property="og:description" content="{first 150 chars of notes}..." />
<meta property="og:image" content="{artwork_url}" />
```

## Styling Philosophy

- Minimal, clean design
- Focus on album artwork as visual centerpiece
- Simple typography (system fonts)
- Subtle hover states
- Mobile-responsive grid calendar
- No heavy animations or effects

## MusicBrainz API Notes

- Base URL: `https://musicbrainz.org/ws/2/`
- Rate limit: 1 request per second (implement delay)
- User-Agent header required: `AppName/Version (contact@email.com)`
- Cover Art Archive: `https://coverartarchive.org/release/{mbid}/front`

**Example Search Query:**

```
https://musicbrainz.org/ws/2/release/?query=title:"Kid A" AND artist:"Radiohead"&fmt=json&limit=20
```

## Redis Commands Reference

**Search Albums:**

```
FT.SEARCH idx:albums "@title:{query}" LIMIT 0 20
```

**Store Album:**

```
HSET album:{mbid} title "Kid A" artist "Radiohead" mbid "xxx" artwork_path "/artwork/xxx.jpg"
```

**Session Management:**

```
# Create session (30 days = 2592000 seconds)
SETEX session:{session_id} 2592000 "{username}"

# Add to user's session set
SADD user:sessions:{username} {session_id}

# Validate session
GET session:{session_id}

# Delete session (logout)
DEL session:{session_id}
SREM user:sessions:{username} {session_id}

# Logout all devices (delete all user sessions)
SMEMBERS user:sessions:{username}  # Get all session_ids
DEL session:{session_id_1} session:{session_id_2} ...
DEL user:sessions:{username}
```

**Store Listening Entry:**

```
HSET listening:{username}:{date} album_mbid "xxx" date "2025-10-13" rating "8.5" favorite_track "Everything In Its Right Place" notes "Amazing atmosphere..."
```

**Get User's All Entries:**

```
KEYS listening:{username}:*
```

## Development Priorities

1. Set up Next.js project with Redis connection (done)
2. Implement authentication (signup/login) (done)
3. Build album search with MusicBrainz integration
4. Create listening entry CRUD operations
5. Build calendar UI component
6. Implement side panel with entry details
7. Add streaming service links
8. Create share functionality
9. Build landing page
10. Add OpenGraph meta tags for rich previews

## Future Considerations (Post-v1)

- User stats (total albums, average rating, genre breakdown)
- Following other users
- Discover page (recent listens from all users)
- Export data (JSON/CSV)
- Dark mode
- Custom themes
