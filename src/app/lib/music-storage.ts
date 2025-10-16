import { getRedisClient } from "./redis-client";

const client = getRedisClient();

// Music data interfaces
export interface Album {
  id: string;
  title: string;
  artistName: string;
  artistId: string;
  listens?: number;
  releaseDate?: string; // what release the track is a part of
  coverArtUrl?: string; // external or filesystem?
  localArtPath?: string;
  tracks?: Track[];
  releaseGroupId?: string; // MusicBrainz release group MBID
}

export interface Track { // stored in albums in Redis
	id: string;
	title: string;
	releaseId: string;
	artistName: string;
	artistID: string;
}

export interface ReleaseGroup {
  id: string;
  title: string;
  artist: string;
  artistId: string;
  type?: string; // e.g., "Album", "Single", "EP"
  firstReleaseDate?: string;
}

export interface Artist {
  id: string;
  name: string;
  country?: string;
  disambiguation?: string;
}

// Search result interface
export interface SearchResult {
  albums: Album[];
  artists: Artist[];
  total: number;
}

// Music cache utilities
export class MusicStorage {
  private static readonly ALBUM_PREFIX = "album:";
  private static readonly ARTIST_PREFIX = "artist:";
  private static readonly RELEASE_GROUP_PREFIX = "release_group:";
  private static readonly SEARCH_PREFIX = "search:";

  /**
   * Cache album data
   */
  static async cacheAlbum(album: Album): Promise<void> {
    await client.set(`${this.ALBUM_PREFIX}${album.id}`, JSON.stringify(album));
  }

  /**
   * Get cached album by ID
   */
  static async getCachedAlbum(albumId: string): Promise<Album | null> {
    const albumData = await client.get(`${this.ALBUM_PREFIX}${albumId}`);
    if (!albumData) {
      return null;
    }

    return JSON.parse(albumData) as Album;
  }

  /**
   * Cache album by MusicBrainz ID
   */
  static async cacheAlbumByMBID(mbid: string, album: Album): Promise<void> {
    await client.set(`${this.ALBUM_PREFIX}mbid:${mbid}`, JSON.stringify(album));
  }

  /**
   * Get cached album by MusicBrainz ID
   */
  static async getCachedAlbumByMBID(mbid: string): Promise<Album | null> {
    const albumData = await client.get(`${this.ALBUM_PREFIX}mbid:${mbid}`);
    if (!albumData) {
      return null;
    }

    return JSON.parse(albumData) as Album;
  }

  /**
   * Cache artist data
   */
  static async cacheArtist(artist: Artist): Promise<void> {
    await client.set(`${this.ARTIST_PREFIX}${artist.id}`, JSON.stringify(artist));
  }

  /**
   * Get cached artist by ID
   */
  static async getCachedArtist(artistId: string): Promise<Artist | null> {
    const artistData = await client.get(`${this.ARTIST_PREFIX}${artistId}`);
    if (!artistData) {
      return null;
    }

    return JSON.parse(artistData) as Artist;
  }

  /**
   * Cache artist by MusicBrainz ID
   */
  static async cacheArtistByMBID(mbid: string, artist: Artist): Promise<void> {
    await client.set(`${this.ARTIST_PREFIX}mbid:${mbid}`, JSON.stringify(artist));
  }

  /**
   * Get cached artist by MusicBrainz ID
   */
  static async getCachedArtistByMBID(mbid: string): Promise<Artist | null> {
    const artistData = await client.get(`${this.ARTIST_PREFIX}mbid:${mbid}`);
    if (!artistData) {
      return null;
    }

    return JSON.parse(artistData) as Artist;
  }

  /**
   * Perform fuzzy search on albums using Redisearch FT.SEARCH
   */
  static async searchAlbums(query: string, limit: number = 50): Promise<Album[]> {
    try {
      // Escape special characters in the query for Redisearch
      const escapedQuery = query.replace(/[.<>!"(){}[\]^*~?:\\]/g, '\\$&');
      
      // Execute Redisearch query with fuzzy matching on title field
      // Using % for wildcard matching on both sides of the query
      const searchQuery = `@title:%${escapedQuery}%`;
      
      console.log(`[REDIS SEARCH] Executing FT.SEARCH album_idx "${searchQuery}" WITHSCORES LIMIT 0 ${limit}`);
      
      // Execute the search command using Bun's RedisClient send method
      const result = await client.send("FT.SEARCH", [
        'album_idx',
        searchQuery,
        'WITHSCORES',
        'LIMIT',
        '0',
        limit.toString()
      ]);
      
      // Parse the Redisearch result
      // Format: [totalResults, id1, score1, fields1..., id2, score2, fields2..., ...]
      if (!result || result.length < 1) {
        return [];
      }
      
      const totalResults = result[0];
      const albums: Album[] = [];
      
      // Parse each result entry
      for (let i = 1; i < result.length; i++) {
        const id = result[i];
        const score = result[i + 1];
        
        // Skip if this is not an album key
        if (!id.startsWith(this.ALBUM_PREFIX)) {
          i += 1; // Skip the score
          continue;
        }
        
        // Get the album data from Redis
        const albumData = await client.get(id);
        if (albumData) {
          const album = JSON.parse(albumData) as Album;
          albums.push(album);
        }
        
        i += 1; // Skip the score
      }
      
      console.log(`[REDIS SEARCH] Found ${albums.length} albums out of ${totalResults} total results`);
      return albums;
      
    } catch (error) {
      console.error('[REDIS SEARCH] Error searching albums:', error);
      // If the index doesn't exist or search fails, return empty array
      return [];
    }
  }

  /**
   * Cache search results
   */
  static async cacheSearchResults(query: string, results: SearchResult): Promise<void> {
    const cacheKey = `${this.SEARCH_PREFIX}${query.toLowerCase()}`;
    await client.set(cacheKey, JSON.stringify(results), 'EX', 3600); // Cache for 1 hour
  }

  /**
   * Get cached search results
   */
  static async getCachedSearchResults(query: string): Promise<SearchResult | null> {
    const cacheKey = `${this.SEARCH_PREFIX}${query.toLowerCase()}`;
    const cachedData = await client.get(cacheKey);
    if (!cachedData) {
      return null;
    }
    
    return JSON.parse(cachedData) as SearchResult;
  }
}