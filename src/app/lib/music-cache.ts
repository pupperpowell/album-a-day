import { getRedisClient } from "./redis-client";

const client = getRedisClient();

// Music data interfaces
export interface Album {
  id: string;
  title: string;
  artist: string;
  artistId: string;
  releaseDate?: string;
  coverArtUrl?: string;
  trackCount?: number;
  musicBrainzId?: string;
  releaseGroupId?: string; // MusicBrainz release group ID
}

export interface ReleaseGroup {
  id: string;
  title: string;
  artist: string;
  artistId: string;
  type?: string; // e.g., "Album", "Single", "EP"
  primaryTypeId?: string;
  secondaryTypeIds?: string[];
  firstReleaseDate?: string;
  musicBrainzId?: string;
}

export interface Artist {
  id: string;
  name: string;
  country?: string;
  disambiguation?: string;
  musicBrainzId?: string;
}

export interface SearchResult {
  albums: Album[];
  artists: Artist[];
  total: number;
}

// Music cache utilities
export class MusicCache {
  private static readonly ALBUM_PREFIX = "album:";
  private static readonly ARTIST_PREFIX = "artist:";
  private static readonly SEARCH_PREFIX = "search:";
  private static readonly COVER_ART_PREFIX = "cover:";
  private static readonly RELEASE_GROUP_PREFIX = "release_group:";
  private static readonly SEARCH_INDEX_PREFIX = "search_index:";
  private static readonly DEFAULT_TTL = 24 * 60 * 60; // 24 hours in seconds
  private static readonly SEARCH_TTL = 4 * 60 * 60; // 4 hours in seconds
  private static readonly COVER_ART_TTL = 7 * 24 * 60 * 60; // 7 days in seconds

  /**
   * Cache album data
   */
  static async cacheAlbum(album: Album, ttl: number = this.DEFAULT_TTL): Promise<void> {
    await client.set(`${this.ALBUM_PREFIX}${album.id}`, JSON.stringify(album));
    await client.expire(`${this.ALBUM_PREFIX}${album.id}`, ttl);
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
  static async cacheAlbumByMBID(mbid: string, album: Album, ttl: number = this.DEFAULT_TTL): Promise<void> {
    await client.set(`${this.ALBUM_PREFIX}mbid:${mbid}`, JSON.stringify(album));
    await client.expire(`${this.ALBUM_PREFIX}mbid:${mbid}`, ttl);
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
  static async cacheArtist(artist: Artist, ttl: number = this.DEFAULT_TTL): Promise<void> {
    await client.set(`${this.ARTIST_PREFIX}${artist.id}`, JSON.stringify(artist));
    await client.expire(`${this.ARTIST_PREFIX}${artist.id}`, ttl);
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
  static async cacheArtistByMBID(mbid: string, artist: Artist, ttl: number = this.DEFAULT_TTL): Promise<void> {
    await client.set(`${this.ARTIST_PREFIX}mbid:${mbid}`, JSON.stringify(artist));
    await client.expire(`${this.ARTIST_PREFIX}mbid:${mbid}`, ttl);
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
   * Cache search results
   */
  static async cacheSearchResults(query: string, results: SearchResult, ttl: number = this.SEARCH_TTL): Promise<void> {
    const key = `${this.SEARCH_PREFIX}${encodeURIComponent(query.toLowerCase())}`;
    await client.set(key, JSON.stringify(results));
    await client.expire(key, ttl);
  }

  /**
   * Get cached search results
   */
  static async getCachedSearchResults(query: string): Promise<SearchResult | null> {
    const key = `${this.SEARCH_PREFIX}${encodeURIComponent(query.toLowerCase())}`;
    const searchData = await client.get(key);
    if (!searchData) {
      return null;
    }

    return JSON.parse(searchData) as SearchResult;
  }

  /**
   * Cache albums for an artist
   */
  static async cacheArtistAlbums(artistId: string, albums: Album[], ttl: number = this.DEFAULT_TTL): Promise<void> {
    const key = `${this.ARTIST_PREFIX}${artistId}:albums`;
    await client.set(key, JSON.stringify(albums));
    await client.expire(key, ttl);
  }

  /**
   * Get cached albums for an artist
   */
  static async getCachedArtistAlbums(artistId: string): Promise<Album[] | null> {
    const key = `${this.ARTIST_PREFIX}${artistId}:albums`;
    const albumsData = await client.get(key);
    if (!albumsData) {
      return null;
    }

    return JSON.parse(albumsData) as Album[];
  }

  /**
   * Cache cover art URL for a release
   */
  static async cacheCoverArt(mbid: string, coverArtUrl: string, ttl: number = this.COVER_ART_TTL): Promise<void> {
    await client.set(`${this.COVER_ART_PREFIX}${mbid}`, coverArtUrl);
    await client.expire(`${this.COVER_ART_PREFIX}${mbid}`, ttl);
  }

  /**
   * Get cached cover art URL for a release
   */
  static async getCachedCoverArt(mbid: string): Promise<string | null> {
    const coverArtData = await client.get(`${this.COVER_ART_PREFIX}${mbid}`);
    if (!coverArtData) {
      return null;
    }

    return coverArtData;
  }

  /**
   * Cache release group data
   */
  static async cacheReleaseGroup(releaseGroup: ReleaseGroup, ttl: number = this.DEFAULT_TTL): Promise<void> {
    await client.set(`${this.RELEASE_GROUP_PREFIX}${releaseGroup.id}`, JSON.stringify(releaseGroup));
    await client.expire(`${this.RELEASE_GROUP_PREFIX}${releaseGroup.id}`, ttl);
  }

  /**
   * Get cached release group by ID
   */
  static async getCachedReleaseGroup(releaseGroupId: string): Promise<ReleaseGroup | null> {
    const releaseGroupData = await client.get(`${this.RELEASE_GROUP_PREFIX}${releaseGroupId}`);
    if (!releaseGroupData) {
      return null;
    }

    return JSON.parse(releaseGroupData) as ReleaseGroup;
  }

  /**
   * Cache release group by MusicBrainz ID
   */
  static async cacheReleaseGroupByMBID(mbid: string, releaseGroup: ReleaseGroup, ttl: number = this.DEFAULT_TTL): Promise<void> {
    await client.set(`${this.RELEASE_GROUP_PREFIX}mbid:${mbid}`, JSON.stringify(releaseGroup));
    await client.expire(`${this.RELEASE_GROUP_PREFIX}mbid:${mbid}`, ttl);
  }

  /**
   * Get cached release group by MusicBrainz ID
   */
  static async getCachedReleaseGroupByMBID(mbid: string): Promise<ReleaseGroup | null> {
    const releaseGroupData = await client.get(`${this.RELEASE_GROUP_PREFIX}mbid:${mbid}`);
    if (!releaseGroupData) {
      return null;
    }

    return JSON.parse(releaseGroupData) as ReleaseGroup;
  }

  /**
   * Cache releases for a release group
   */
  static async cacheReleaseGroupReleases(releaseGroupId: string, releases: Album[], ttl: number = this.DEFAULT_TTL): Promise<void> {
    const key = `${this.RELEASE_GROUP_PREFIX}${releaseGroupId}:releases`;
    console.log(`[CACHE] Caching ${releases.length} releases for release group "${releaseGroupId}" with key: "${key}"`);
    await client.set(key, JSON.stringify(releases));
    await client.expire(key, ttl);
  }

  /**
   * Get cached releases for a release group
   */
  static async getCachedReleaseGroupReleases(releaseGroupId: string): Promise<Album[] | null> {
    const key = `${this.RELEASE_GROUP_PREFIX}${releaseGroupId}:releases`;
    console.log(`[CACHE] Looking for releases with key: "${key}"`);
    const releasesData = await client.get(key);
    if (!releasesData) {
      console.log(`[CACHE] No releases found for key: "${key}"`);
      return null;
    }

    console.log(`[CACHE] Found releases for key: "${key}"`);
    return JSON.parse(releasesData) as Album[];
  }


  /**
   * Invalidate cache for an album
   */
  static async invalidateAlbum(albumId: string): Promise<void> {
    await client.del(`${this.ALBUM_PREFIX}${albumId}`);
  }

  /**
   * Invalidate cache for an artist
   */
  static async invalidateArtist(artistId: string): Promise<void> {
    await client.del(`${this.ARTIST_PREFIX}${artistId}`);
    await client.del(`${this.ARTIST_PREFIX}${artistId}:albums`);
  }

  /**
   * Clear all search cache
   */
  static async clearSearchCache(): Promise<void> {
    const keys = await client.keys(`${this.SEARCH_PREFIX}*`);
    if (keys.length > 0) {
      await client.del(...keys);
    }
  }

  /**
   * Get cache statistics
   */
  static async getCacheStats(): Promise<{
    albums: number;
    artists: number;
    releaseGroups: number;
    searches: number;
    coverArt: number;
  }> {
    const [albumKeys, artistKeys, releaseGroupKeys, searchKeys, coverArtKeys] = await Promise.all([
      client.keys(`${this.ALBUM_PREFIX}*`),
      client.keys(`${this.ARTIST_PREFIX}*`),
      client.keys(`${this.RELEASE_GROUP_PREFIX}*`),
      client.keys(`${this.SEARCH_PREFIX}*`),
      client.keys(`${this.COVER_ART_PREFIX}*`),
    ]);

    return {
      albums: albumKeys.length,
      artists: artistKeys.filter(key => !key.includes(":albums")).length,
      releaseGroups: releaseGroupKeys.filter(key =>
        !key.includes(":releases") &&
        !key.includes(":search_terms") &&
        !key.includes("mbid:")
      ).length,
      searches: searchKeys.length,
      coverArt: coverArtKeys.length,
    };
  }
}