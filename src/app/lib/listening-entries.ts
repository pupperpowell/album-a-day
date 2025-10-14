import { getRedisClient } from "./redis-client";
import { Album } from "./music-storage";

const client = getRedisClient();

// Listening entry interfaces
export interface ListeningEntry {
  username: string;
  date: string; // YYYY-MM-DD
  album_mbid: string;
  rating: number; // 0-10
  favorite_track: string;
  notes: string;
  created_at: string;
  updated_at?: string;
}

export interface ListeningEntryWithAlbum extends ListeningEntry {
  album: Album;
}

export interface CalendarListeningEntry {
  date: string;
  album: Album | null;
  rating?: number;
  favorite_track?: string;
  notes?: string;
}

// Listening entries utilities
export class ListeningEntries {
  private static readonly LISTENING_PREFIX = "listening:";

  /**
   * Add or update a listening entry
   */
  static async addOrUpdateListeningEntry(
    username: string,
    date: string,
    album_mbid: string,
    rating: number,
    favorite_track: string,
    notes: string
  ): Promise<ListeningEntry> {
    const key = `${this.LISTENING_PREFIX}${username}:${date}`;
    const now = new Date().toISOString();

    // Check if entry already exists
    const existingEntry = await this.getListeningEntry(username, date);
    
    const entry: ListeningEntry = {
      username,
      date,
      album_mbid,
      rating,
      favorite_track,
      notes,
      created_at: existingEntry ? existingEntry.created_at : now,
      updated_at: now,
    };

    // Store as hash for better field access
    const hashData: Record<string, string> = {
      username: entry.username,
      date: entry.date,
      album_mbid: entry.album_mbid,
      rating: entry.rating.toString(),
      favorite_track: entry.favorite_track,
      notes: entry.notes,
      created_at: entry.created_at,
    };
    
    if (entry.updated_at) {
      hashData.updated_at = entry.updated_at;
    }
    
    await client.hset(key, hashData);

    return entry;
  }

  /**
   * Get a listening entry for a specific user and date
   */
  static async getListeningEntry(
    username: string,
    date: string
  ): Promise<ListeningEntry | null> {
    const key = `${this.LISTENING_PREFIX}${username}:${date}`;
    const entryData = await client.hgetall(key);
    
    if (!entryData || Object.keys(entryData).length === 0) {
      return null;
    }

    return {
      username: entryData.username,
      date: entryData.date,
      album_mbid: entryData.album_mbid,
      rating: parseFloat(entryData.rating),
      favorite_track: entryData.favorite_track,
      notes: entryData.notes,
      created_at: entryData.created_at,
      updated_at: entryData.updated_at || undefined,
    };
  }

  /**
   * Get all listening entries for a user
   */
  static async getAllUserEntries(username: string): Promise<ListeningEntry[]> {
    const pattern = `${this.LISTENING_PREFIX}${username}:*`;
    const keys = await client.keys(pattern);
    
    if (keys.length === 0) {
      return [];
    }

    const entries: ListeningEntry[] = [];
    
    for (const key of keys) {
      const entryData = await client.hgetall(key);
      if (entryData && Object.keys(entryData).length > 0) {
        entries.push({
          username: entryData.username,
          date: entryData.date,
          album_mbid: entryData.album_mbid,
          rating: parseFloat(entryData.rating),
          favorite_track: entryData.favorite_track,
          notes: entryData.notes,
          created_at: entryData.created_at,
          updated_at: entryData.updated_at || undefined,
        });
      }
    }

    // Sort by date (newest first)
    return entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  /**
   * Get listening entries for a user within a date range
   */
  static async getUserEntriesInRange(
    username: string,
    startDate: string,
    endDate: string
  ): Promise<CalendarListeningEntry[]> {
    const allEntries = await this.getAllUserEntries(username);
    
    // Filter by date range
    const filteredEntries = allEntries.filter(entry => {
      const entryDate = new Date(entry.date);
      const start = new Date(startDate);
      const end = new Date(endDate);
      return entryDate >= start && entryDate <= end;
    });

    // Create calendar entries with album details
    const calendarEntries: CalendarListeningEntry[] = [];
    
    for (const entry of filteredEntries) {
      // Get album details
      const albumKey = `album:${entry.album_mbid}`;
      const albumData = await client.get(albumKey);
      let album: Album | null = null;
      
      if (albumData) {
        album = JSON.parse(albumData) as Album;
      }

      calendarEntries.push({
        date: entry.date,
        album,
        rating: entry.rating,
        favorite_track: entry.favorite_track,
        notes: entry.notes,
      });
    }

    return calendarEntries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }

  /**
   * Delete a listening entry
   */
  static async deleteListeningEntry(
    username: string,
    date: string
  ): Promise<boolean> {
    const key = `${this.LISTENING_PREFIX}${username}:${date}`;
    const result = await client.del(key);
    return result > 0;
  }

  /**
   * Get listening entry with full album details
   */
  static async getListeningEntryWithAlbum(
    username: string,
    date: string
  ): Promise<ListeningEntryWithAlbum | null> {
    const entry = await this.getListeningEntry(username, date);
    
    if (!entry) {
      return null;
    }

    // Get album details
    const albumKey = `album:${entry.album_mbid}`;
    const albumData = await client.get(albumKey);
    
    if (!albumData) {
      return null;
    }

    const album = JSON.parse(albumData) as Album;

    return {
      ...entry,
      album,
    };
  }

  /**
   * Validate rating is within acceptable range
   */
  static validateRating(rating: number): boolean {
    return rating >= -1 && rating <= 11 && Number.isFinite(rating);
  }

  /**
   * Validate date format (YYYY-MM-DD)
   */
  static validateDate(date: string): boolean {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return false;
    }

    const parsedDate = new Date(date);
    return !isNaN(parsedDate.getTime()) && date === parsedDate.toISOString().split('T')[0];
  }

  /**
   * Check if date is in the future (not allowed)
   */
  static isDateInFuture(date: string): boolean {
    const entryDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    entryDate.setHours(0, 0, 0, 0);
    
    return entryDate > today;
  }
}