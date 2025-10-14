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

// Music cache utilities
export class MusicStorage {
  private static readonly ALBUM_PREFIX = "album:";
  private static readonly ARTIST_PREFIX = "artist:";
  private static readonly RELEASE_GROUP_PREFIX = "release_group:";

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
}