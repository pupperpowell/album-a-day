import { getRedisClient } from "./redis-client";
import { Album } from "./music-cache";

const client = getRedisClient();

// User album tracking interfaces
export interface UserAlbum {
  userId: string;
  albumId: string;
  date: string; // ISO date string (YYYY-MM-DD)
  rating?: number; // 1-5 rating
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CalendarEntry {
  date: string;
  album: Album | null;
  rating?: number;
  notes?: string;
}

export interface UserStats {
  totalAlbums: number;
  averageRating: number;
  currentStreak: number;
  longestStreak: number;
  topGenres?: string[];
}

// User album tracking utilities
export class UserAlbums {
  private static readonly USER_ALBUM_PREFIX = "user_album:";
  private static readonly USER_CALENDAR_PREFIX = "user_calendar:";
  private static readonly USER_STATS_PREFIX = "user_stats:";
  private static readonly DAILY_ALBUM_PREFIX = "daily_album:";

  /**
   * Add an album to a user's calendar
   */
  static async addUserAlbum(
    userId: string,
    albumId: string,
    date: string,
    rating?: number,
    notes?: string
  ): Promise<UserAlbum> {
    const key = `${this.USER_ALBUM_PREFIX}${userId}:${date}`;
    const now = new Date().toISOString();

    const userAlbum: UserAlbum = {
      userId,
      albumId,
      date,
      rating,
      notes,
      createdAt: now,
      updatedAt: now,
    };

    await client.set(key, JSON.stringify(userAlbum));
    
    // Update user calendar
    await this.updateUserCalendar(userId, date, albumId, rating, notes);
    
    // Update user stats
    await this.updateUserStats(userId);

    return userAlbum;
  }

  /**
   * Get a user's album for a specific date
   */
  static async getUserAlbum(userId: string, date: string): Promise<UserAlbum | null> {
    const key = `${this.USER_ALBUM_PREFIX}${userId}:${date}`;
    const albumData = await client.get(key);
    if (!albumData) {
      return null;
    }

    return JSON.parse(albumData) as UserAlbum;
  }

  /**
   * Update a user's album entry
   */
  static async updateUserAlbum(
    userId: string,
    date: string,
    updates: {
      rating?: number;
      notes?: string;
    }
  ): Promise<UserAlbum | null> {
    const existingAlbum = await this.getUserAlbum(userId, date);
    if (!existingAlbum) {
      return null;
    }

    const updatedAlbum: UserAlbum = {
      ...existingAlbum,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    const key = `${this.USER_ALBUM_PREFIX}${userId}:${date}`;
    await client.set(key, JSON.stringify(updatedAlbum));
    
    // Update user calendar
    await this.updateUserCalendar(userId, date, updatedAlbum.albumId, updatedAlbum.rating, updatedAlbum.notes);
    
    // Update user stats
    await this.updateUserStats(userId);

    return updatedAlbum;
  }

  /**
   * Delete a user's album entry
   */
  static async deleteUserAlbum(userId: string, date: string): Promise<boolean> {
    const key = `${this.USER_ALBUM_PREFIX}${userId}:${date}`;
    const result = await client.del(key);
    
    if (result > 0) {
      // Update user calendar
      await this.updateUserCalendar(userId, date, null);
      // Update user stats
      await this.updateUserStats(userId);
      return true;
    }
    
    return false;
  }

  /**
   * Get user's calendar for a date range
   */
  static async getUserCalendar(
    userId: string,
    startDate: string,
    endDate: string
  ): Promise<CalendarEntry[]> {
    const key = `${this.USER_CALENDAR_PREFIX}${userId}`;
    const calendarData = await client.hgetall(key);
    
    const entries: CalendarEntry[] = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    for (let date = start; date <= end; date.setDate(date.getDate() + 1)) {
      const dateStr = date.toISOString().split('T')[0];
      const entryData = calendarData[dateStr];
      
      if (entryData) {
        entries.push(JSON.parse(entryData) as CalendarEntry);
      } else {
        entries.push({
          date: dateStr,
          album: null,
        });
      }
    }
    
    return entries;
  }

  /**
   * Update user calendar entry
   */
  private static async updateUserCalendar(
    userId: string,
    date: string,
    albumId: string | null,
    rating?: number,
    notes?: string
  ): Promise<void> {
    const key = `${this.USER_CALENDAR_PREFIX}${userId}`;
    
    const entry: CalendarEntry = {
      date,
      album: albumId ? { id: albumId } as Album : null,
      rating,
      notes,
    };
    
    if (albumId) {
      await client.hset(key, { [date]: JSON.stringify(entry) });
    } else {
      await client.hdel(key, date);
    }
  }

  /**
   * Get user statistics
   */
  static async getUserStats(userId: string): Promise<UserStats> {
    const key = `${this.USER_STATS_PREFIX}${userId}`;
    const statsData = await client.get(key);
    
    if (statsData) {
      return JSON.parse(statsData) as UserStats;
    }
    
    // Calculate stats if not cached
    return await this.calculateUserStats(userId);
  }

  /**
   * Calculate user statistics
   */
  private static async calculateUserStats(userId: string): Promise<UserStats> {
    const albumPattern = `${this.USER_ALBUM_PREFIX}${userId}:*`;
    const keys = await client.keys(albumPattern);
    
    if (keys.length === 0) {
      return {
        totalAlbums: 0,
        averageRating: 0,
        currentStreak: 0,
        longestStreak: 0,
      };
    }
    
    // Get all user albums
    const albumData = await client.mget(...keys);
    const albums = albumData
      .filter(data => data !== null)
      .map(data => JSON.parse(data as string) as UserAlbum);
    
    // Calculate stats
    const totalAlbums = albums.length;
    const ratedAlbums = albums.filter(album => album.rating !== undefined);
    const averageRating = ratedAlbums.length > 0
      ? ratedAlbums.reduce((sum, album) => sum + (album.rating || 0), 0) / ratedAlbums.length
      : 0;
    
    // Calculate streaks
    const sortedDates = albums
      .map(album => new Date(album.date))
      .sort((a, b) => a.getTime() - b.getTime());
    
    const { currentStreak, longestStreak } = this.calculateStreaks(sortedDates);
    
    const stats: UserStats = {
      totalAlbums,
      averageRating,
      currentStreak,
      longestStreak,
    };
    
    // Cache the stats
    const key = `${this.USER_STATS_PREFIX}${userId}`;
    await client.set(key, JSON.stringify(stats));
    await client.expire(key, 60 * 60); // Cache for 1 hour
    
    return stats;
  }

  /**
   * Calculate current and longest streaks
   */
  private static calculateStreaks(dates: Date[]): { currentStreak: number; longestStreak: number } {
    if (dates.length === 0) {
      return { currentStreak: 0, longestStreak: 0 };
    }
    
    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 1;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Check if the most recent date is today or yesterday
    const mostRecent = dates[dates.length - 1];
    mostRecent.setHours(0, 0, 0, 0);
    
    const dayDiff = Math.floor((today.getTime() - mostRecent.getTime()) / (1000 * 60 * 60 * 24));
    
    if (dayDiff <= 1) {
      currentStreak = 1;
    }
    
    for (let i = 1; i < dates.length; i++) {
      const prevDate = new Date(dates[i - 1]);
      const currDate = new Date(dates[i]);
      prevDate.setHours(0, 0, 0, 0);
      currDate.setHours(0, 0, 0, 0);
      
      const dayDiff = Math.floor((currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (dayDiff === 1) {
        tempStreak++;
        if (i === dates.length - 1 && dayDiff <= 1) {
          currentStreak = tempStreak;
        }
      } else {
        longestStreak = Math.max(longestStreak, tempStreak);
        tempStreak = 1;
      }
    }
    
    longestStreak = Math.max(longestStreak, tempStreak);
    
    return { currentStreak, longestStreak };
  }

  /**
   * Update user statistics cache
   */
  private static async updateUserStats(userId: string): Promise<void> {
    const stats = await this.calculateUserStats(userId);
    const key = `${this.USER_STATS_PREFIX}${userId}`;
    await client.set(key, JSON.stringify(stats));
    await client.expire(key, 60 * 60); // Cache for 1 hour
  }

  /**
   * Get all albums for a user
   */
  static async getAllUserAlbums(userId: string): Promise<UserAlbum[]> {
    const albumPattern = `${this.USER_ALBUM_PREFIX}${userId}:*`;
    const keys = await client.keys(albumPattern);
    
    if (keys.length === 0) {
      return [];
    }
    
    const albumData = await client.mget(...keys);
    return albumData
      .filter(data => data !== null)
      .map(data => JSON.parse(data as string) as UserAlbum)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }
}