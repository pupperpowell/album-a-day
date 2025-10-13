import { Album, Artist, SearchResult, ReleaseGroup, MusicCache } from "./music-cache";

const MUSICBRAINZ_API_BASE = "https://musicbrainz.org/ws/2/";
const RELEASE_API_BASE = `${MUSICBRAINZ_API_BASE}release/`;
const RELEASE_GROUP_API_BASE = `${MUSICBRAINZ_API_BASE}release-group/`;
const COVER_ART_ARCHIVE_BASE = "https://coverartarchive.org";

export interface MusicBrainzRelease {
  id: string;
  title: string;
  "artist-credit": Array<{
    name: string;
    artist: {
      id: string;
      name: string;
    };
  }>;
  date?: string;
  "track-count": number;
  "cover-art-archive"?: {
    front?: boolean;
    back?: boolean;
  };
  "release-group": {
    id: string;
  };
}

export interface MusicBrainzReleaseGroup {
  id: string;
  title: string;
  "artist-credit": Array<{
    name: string;
    artist: {
      id: string;
      name: string;
    };
  }>;
  type?: string;
  "primary-type"?: string;
  "secondary-type-list"?: string[];
  "first-release-date"?: string;
  releases?: Array<{
    id: string;
    title: string;
    date?: string;
    "track-count": number;
  }>;
}

export interface MusicBrainzArtist {
  id: string;
  name: string;
  country?: string;
  disambiguation?: string;
}

export interface MusicBrainzSearchResponse {
  "release-groups"?: Array<{
    id: string;
    title: string;
    "artist-credit": Array<{
      name: string;
      artist: {
        id: string;
        name: string;
      };
    }>;
    type?: string;
    "primary-type"?: string;
    "secondary-type-list"?: string[];
    "first-release-date"?: string;
  }>;
  releases?: Array<{
    id: string;
    title: string;
    "artist-credit": Array<{
      name: string;
      artist: {
        id: string;
        name: string;
      };
    }>;
    date?: string;
    "track-count": number;
  }>;
  artists?: Array<{
    id: string;
    name: string;
    country?: string;
    disambiguation?: string;
  }>;
  count: number;
}

export class MusicBrainzClient {
  private static readonly USER_AGENT = "AlbumADay/0.0.1 ( https://github.com/pupperpowell/album-a-day )";
  private static readonly RATE_LIMIT_DELAY = 100; // 100 milliseconds between requests
  private static readonly BURST_LIMIT = 5; // Allow up to 5 requests in quick succession
  private static readonly BURST_WINDOW = 1000; // 1 second window for burst tracking
  private static lastRequestTime = 0;
  private static requestTimes: number[] = []; // Track recent request times for burst control

  private static async makeRequest<T>(url: string): Promise<T> {
    const now = Date.now();
    
    // Clean old request times outside the burst window
    this.requestTimes = this.requestTimes.filter(time => now - time < this.BURST_WINDOW);
    
    // Check if we're in a burst
    if (this.requestTimes.length >= this.BURST_LIMIT) {
      // We're in a burst, wait until the oldest request is outside the window
      const oldestRequest = this.requestTimes[0];
      const waitTime = this.BURST_WINDOW - (now - oldestRequest);
      if (waitTime > 0) {
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
    
    // Apply rate limiting for non-burst requests
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < this.RATE_LIMIT_DELAY && this.requestTimes.length < this.BURST_LIMIT) {
      await new Promise(resolve => setTimeout(resolve, this.RATE_LIMIT_DELAY - timeSinceLastRequest));
    }

    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": this.USER_AGENT,
          "Accept": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`MusicBrainz API error: ${response.status} ${response.statusText}`);
      }

      this.lastRequestTime = Date.now();
      this.requestTimes.push(this.lastRequestTime);
      return await response.json();
    } catch (error) {
      console.error("MusicBrainz API request failed:", error);
      throw error;
    }
  }

  /**
   * Search for release groups and artists
   */
  static async search(query: string, limit: number = 10): Promise<SearchResult> {
    console.log(`[MUSICBRAINZ] Starting search for query: "${query}" with limit: ${limit}`);
    const encodedQuery = encodeURIComponent(query);
    const searchUrl = `${MUSICBRAINZ_API_BASE}release-group/?query=${encodedQuery}&limit=${limit}&fmt=json`;
    console.log(`[MUSICBRAINZ] Search URL: ${searchUrl}`);
    
    try {
      const data = await this.makeRequest<MusicBrainzSearchResponse>(searchUrl);
      console.log(`[MUSICBRAINZ] Search response received, count: ${data.count}`);
      
      const albums: Album[] = [];
      const artists: Artist[] = [];
      const releaseGroupIds: string[] = [];

      // Process release groups
      if (data["release-groups"]) {
        console.log(`[MUSICBRAINZ] Processing ${data["release-groups"].length} release groups`);
        for (const releaseGroup of data["release-groups"]) {
          const artistCredit = releaseGroup["artist-credit"]?.[0];
          if (artistCredit) {
            // Create release group object for caching
            const rgObject: ReleaseGroup = {
              id: `mbid_${releaseGroup.id}`,
              title: releaseGroup.title,
              artist: artistCredit.name,
              artistId: `mbid_${artistCredit.artist.id}`,
              type: releaseGroup.type || releaseGroup["primary-type"],
              secondaryTypeIds: releaseGroup["secondary-type-list"],
              firstReleaseDate: releaseGroup["first-release-date"],
              musicBrainzId: releaseGroup.id,
            };

            // Cache the release group
            await MusicCache.cacheReleaseGroup(rgObject);
            await MusicCache.cacheReleaseGroupByMBID(releaseGroup.id, rgObject);

            // Get releases for this release group
            console.log(`[MUSICBRAINZ] Getting releases for release group: ${releaseGroup.id}`);
            const releases = await this.getReleaseGroupReleases(releaseGroup.id, 1); // Get one representative release
            console.log(`[MUSICBRAINZ] Found ${releases.length} releases for release group: ${releaseGroup.id}`);
            if (releases.length > 0) {
              const album = releases[0];
              // Use release group title instead of release title for consistency
              album.title = releaseGroup.title;
              album.releaseDate = album.releaseDate || releaseGroup["first-release-date"];

              albums.push(album);
              
              // Cache the mapping from release to release group
              await MusicCache.cacheReleaseGroupReleases(`mbid_${releaseGroup.id}`, [album]);
            }
          }
        }

        // Fetch cover art URLs in parallel
        const releaseIds = albums.map(album => album.musicBrainzId).filter(Boolean) as string[];
        if (releaseIds.length > 0) {
          try {
            const coverArtMap = await this.getCoverArtUrls(releaseIds);
            
            // Assign cover art URLs to albums
            albums.forEach((album) => {
              const mbid = album.musicBrainzId;
              if (mbid && coverArtMap.has(mbid)) {
                const coverArtUrl = coverArtMap.get(mbid);
                if (coverArtUrl) {
                  album.coverArtUrl = coverArtUrl;
                }
              }
            });
          } catch (error) {
            console.warn("Failed to fetch cover art in parallel:", error);
            // Continue without cover art if parallel fetching fails
          }
        }
      }

      // Process artists (if any)
      if (data.artists) {
        for (const artist of data.artists) {
          const artistData: Artist = {
            id: `mbid_${artist.id}`,
            name: artist.name,
            country: artist.country,
            disambiguation: artist.disambiguation,
            musicBrainzId: artist.id,
          };
          artists.push(artistData);
        }
      }

      const result = {
        albums,
        artists,
        total: data.count || 0,
      };
      console.log(`[MUSICBRAINZ] Search complete - returning ${result.albums.length} albums, ${result.artists.length} artists, total: ${result.total}`);
      return result;
    } catch (error) {
      console.error("[MUSICBRAINZ] Search failed:", error);
      throw error;
    }
  }

  /**
   * Search for releases and artists without cover art (faster)
   */
  static async searchBasic(query: string, limit: number = 10): Promise<SearchResult> {
    const encodedQuery = encodeURIComponent(query);
    const searchUrl = `${MUSICBRAINZ_API_BASE}release/?query=${encodedQuery}&limit=${limit}&fmt=json`;
    
    try {
      const data = await this.makeRequest<MusicBrainzSearchResponse>(searchUrl);
      
      const albums: Album[] = [];
      const artists: Artist[] = [];

      // Process releases (without cover art)
      if (data.releases) {
        for (const release of data.releases) {
          const artistCredit = release["artist-credit"]?.[0];
          if (artistCredit) {
            const album: Album = {
              id: `mbid_${release.id}`,
              title: release.title,
              artist: artistCredit.name,
              artistId: `mbid_${artistCredit.artist.id}`,
              releaseDate: release.date,
              trackCount: release["track-count"],
              musicBrainzId: release.id,
            };

            albums.push(album);
          }
        }
      }

      // Process artists (if any)
      if (data.artists) {
        for (const artist of data.artists) {
          const artistData: Artist = {
            id: `mbid_${artist.id}`,
            name: artist.name,
            country: artist.country,
            disambiguation: artist.disambiguation,
            musicBrainzId: artist.id,
          };
          artists.push(artistData);
        }
      }

      return {
        albums,
        artists,
        total: data.count || 0,
      };
    } catch (error) {
      console.error("Basic search failed:", error);
      throw error;
    }
  }

  /**
   * Enrich albums with cover art (can be called asynchronously)
   */
  static async enrichWithCoverArt(albums: Album[]): Promise<void> {
    const releaseIds = albums
      .filter(album => album.musicBrainzId && !album.coverArtUrl)
      .map(album => album.musicBrainzId!);
    
    if (releaseIds.length === 0) {
      return;
    }

    try {
      const coverArtMap = await this.getCoverArtUrls(releaseIds);
      
      // Assign cover art URLs to albums
      albums.forEach((album) => {
        const mbid = album.musicBrainzId;
        if (mbid && coverArtMap.has(mbid)) {
          const coverArtUrl = coverArtMap.get(mbid);
          if (coverArtUrl) {
            album.coverArtUrl = coverArtUrl;
          }
        }
      });
    } catch (error) {
      console.warn("Failed to enrich albums with cover art:", error);
    }
  }

  /**
   * Get release details by MusicBrainz ID
   */
  static async getRelease(mbid: string): Promise<Album | null> {
    const releaseUrl = `${RELEASE_API_BASE}${mbid}?inc=artist-credits&fmt=json`;
    
    try {
      const release = await this.makeRequest<MusicBrainzRelease>(releaseUrl);
      
      const artistCredit = release["artist-credit"]?.[0];
      if (!artistCredit) {
        return null;
      }

      const album: Album = {
        id: `mbid_${release.id}`,
        title: release.title,
        artist: artistCredit.name,
        artistId: `mbid_${artistCredit.artist.id}`,
        releaseDate: release.date,
        trackCount: release["track-count"],
        musicBrainzId: release.id,
        releaseGroupId: release["release-group"]?.id,
      };

      // Try to get cover art
      try {
        const coverArtUrl = await this.getCoverArtUrl(release.id);
        if (coverArtUrl) {
          album.coverArtUrl = coverArtUrl;
        }
      } catch (error) {
        console.warn(`Failed to get cover art for ${release.id}:`, error);
      }

      return album;
    } catch (error) {
      console.error("Failed to get release:", error);
      return null;
    }
  }

  /**
   * Get artist details by MusicBrainz ID
   */
  static async getArtist(mbid: string): Promise<Artist | null> {
    const artistUrl = `${MUSICBRAINZ_API_BASE}artist/${mbid}?fmt=json`;
    
    try {
      const artist = await this.makeRequest<MusicBrainzArtist>(artistUrl);
      
      return {
        id: `mbid_${artist.id}`,
        name: artist.name,
        country: artist.country,
        disambiguation: artist.disambiguation,
        musicBrainzId: artist.id,
      };
    } catch (error) {
      console.error("Failed to get artist:", error);
      return null;
    }
  }

  /**
   * Get releases for an artist
   */
  static async getArtistReleases(mbid: string, limit: number = 25): Promise<Album[]> {
    const releasesUrl = `${RELEASE_API_BASE}?artist=${mbid}&limit=${limit}&fmt=json`;
    
    try {
      const data = await this.makeRequest<{ releases: MusicBrainzRelease[] }>(releasesUrl);
      
      const albums: Album[] = [];
      
      if (data.releases) {
        for (const release of data.releases) {
          const artistCredit = release["artist-credit"]?.[0];
          if (artistCredit) {
            const album: Album = {
              id: `mbid_${release.id}`,
              title: release.title,
              artist: artistCredit.name,
              artistId: `mbid_${artistCredit.artist.id}`,
              releaseDate: release.date,
              trackCount: release["track-count"],
              musicBrainzId: release.id,
              releaseGroupId: release["release-group"]?.id,
            };

            // Try to get cover art
            try {
              const coverArtUrl = await this.getCoverArtUrl(release.id);
              if (coverArtUrl) {
                album.coverArtUrl = coverArtUrl;
              }
            } catch (error) {
              console.warn(`Failed to get cover art for ${release.id}:`, error);
            }

            albums.push(album);
          }
        }
      }

      return albums;
    } catch (error) {
      console.error("Failed to get artist releases:", error);
      return [];
    }
  }

  /**
   * Get cover art URL for a release (with caching)
   */
  private static async getCoverArtUrl(mbid: string): Promise<string | null> {
    try {
      // Check cache first
      const cachedUrl = await MusicCache.getCachedCoverArt(mbid);
      if (cachedUrl) {
        return cachedUrl;
      }

      // First, get the cover art metadata to find the front image
      const metadataUrl = `${COVER_ART_ARCHIVE_BASE}/release/${mbid}`;
      const response = await fetch(metadataUrl, {
        headers: {
          "Accept": "application/json",
        },
      });
      
      if (!response.ok) {
        return null;
      }
      
      const data = await response.json();
      
      // Find the front image
      const frontImage = data.images?.find((image: any) => image.front);
      let coverArtUrl: string | null = null;
      
      if (frontImage) {
        // Return the thumbnail URL (500px is a good balance)
        coverArtUrl = frontImage.thumbnails?.["500"] || frontImage.image;
      } else if (data.images && data.images.length > 0) {
        // If no front image is marked, try to get the first image
        const firstImage = data.images[0];
        coverArtUrl = firstImage.thumbnails?.["500"] || firstImage.image;
      }
      
      // Cache the result (even if null, to avoid repeated failed requests)
      await MusicCache.cacheCoverArt(mbid, coverArtUrl || "");
      
      return coverArtUrl;
    } catch (error) {
      console.error("Failed to get cover art URL:", error);
      // Cache the failure to avoid repeated failed requests
      await MusicCache.cacheCoverArt(mbid, "");
      return null;
    }
  }

  /**
   * Get cover art URLs for multiple releases in parallel
   */
  private static async getCoverArtUrls(mbid: string[]): Promise<Map<string, string | null>> {
    const results = new Map<string, string | null>();
    
    // Create an array of promises for parallel execution
    const coverArtPromises = mbid.map(async (id) => {
      const url = await this.getCoverArtUrl(id);
      return { id, url };
    });
    
    // Wait for all promises to resolve
    const coverArtResults = await Promise.allSettled(coverArtPromises);
    
    // Process results
    coverArtResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        results.set(result.value.id, result.value.url);
      } else {
        console.warn(`Failed to get cover art for ${mbid[index]}:`, result.reason);
        results.set(mbid[index], null);
      }
    });
    
    return results;
  }

  /**
   * Get release group details by MusicBrainz ID
   */
  static async getReleaseGroup(mbid: string): Promise<ReleaseGroup | null> {
    const releaseGroupUrl = `${RELEASE_GROUP_API_BASE}${mbid}?inc=artist-credits&releases&fmt=json`;
    
    try {
      const releaseGroup = await this.makeRequest<MusicBrainzReleaseGroup>(releaseGroupUrl);
      
      const artistCredit = releaseGroup["artist-credit"]?.[0];
      if (!artistCredit) {
        return null;
      }

      const rgObject: ReleaseGroup = {
        id: `mbid_${releaseGroup.id}`,
        title: releaseGroup.title,
        artist: artistCredit.name,
        artistId: `mbid_${artistCredit.artist.id}`,
        type: releaseGroup.type || releaseGroup["primary-type"],
        secondaryTypeIds: releaseGroup["secondary-type-list"],
        firstReleaseDate: releaseGroup["first-release-date"],
        musicBrainzId: releaseGroup.id,
      };

      return rgObject;
    } catch (error) {
      console.error("Failed to get release group:", error);
      return null;
    }
  }

  /**
   * Get releases for a release group
   */
  static async getReleaseGroupReleases(releaseGroupId: string, limit: number = 5): Promise<Album[]> {
    const releasesUrl = `${RELEASE_GROUP_API_BASE}${releaseGroupId}?inc=url-rels&fmt=json`;
    
	// https://musicbrainz.org/ws/2/release-group/4cac4f58-d2f2-3d71-92ec-187409d71f09?inc=url-rels&fmt=json
    try {
      const data = await this.makeRequest<{ releases: MusicBrainzRelease[] }>(releasesUrl);
      
      const albums: Album[] = [];
      
      if (data.releases) {
        for (const release of data.releases) {
          const artistCredit = release["artist-credit"]?.[0];
          if (artistCredit) {
            const album: Album = {
              id: `mbid_${release.id}`,
              title: release.title,
              artist: artistCredit.name,
              artistId: `mbid_${artistCredit.artist.id}`,
              releaseDate: release.date,
              trackCount: release["track-count"],
              musicBrainzId: release.id,
              releaseGroupId: releaseGroupId,
            };

            albums.push(album);
          }
        }
      }

      return albums;
    } catch (error) {
      console.error("Failed to get release group releases:", error);
      return [];
    }
  }
}