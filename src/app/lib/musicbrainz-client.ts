import { Album, Artist, ReleaseGroup, MusicStorage } from "./music-storage";
import { downloadAndSaveArtwork } from "./artwork-storage";
import { NextResponse } from "next/server";

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
    "artist-credit"?: Array<{
      name: string;
      artist: {
        id: string;
        name: string;
      };
    }>;
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
  static async search(query: string, limit: number = 10): Promise<any> {
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
              id: `${releaseGroup.id}`,
              title: releaseGroup.title,
              artist: artistCredit.name,
              artistId: `${artistCredit.artist.id}`,
              type: releaseGroup.type || releaseGroup["primary-type"],
              firstReleaseDate: releaseGroup["first-release-date"],
            };

            // Get releases for this release group to find one with cover art
            console.log(`[MUSICBRAINZ] Getting releases for release group: ${releaseGroup.id}`);
            const releases = await this.getReleaseGroupReleases(
              releaseGroup.id,
              1, // Only get the first release for performance
              artistCredit.name,
              artistCredit.artist.id
            );

            if (releases.length > 0) {
              // Use the first release (which should be the primary release)
              const release = releases[0];
              console.log(`[MUSICBRAINZ] Using release ${release.id} for release group ${releaseGroup.id}`);
              
              // Update the album with release information
              const album: Album = {
                id: `${release.id}`, // Use release ID as album ID
                title: release.title,
                artistName: release.artistName,
                artistId: `${release.artistId}`,
                releaseDate: release.releaseDate,
				tracks: release.tracks,
                releaseGroupId: `${releaseGroup.id}`,
                coverArtUrl: release.coverArtUrl, // Use the cover art from the release
              };

              console.log(`[MUSICBRAINZ] Adding album to results: "${album.title}" by ${album.artistName}`);
              albums.push(album);
              
              // Cache the album
              console.log(`[MUSICBRAINZ] Caching album for release ${release.id}`);
              await MusicStorage.cacheAlbum(album);
              console.log(`[MUSICBRAINZ] Album cached successfully`);
            } else {
              // Fallback: create album from release group data if no releases found
              console.log(`[MUSICBRAINZ] No releases found for release group ${releaseGroup.id}, using release group data`);
              const album: Album = {
                id: `${releaseGroup.id}`, // Use release group ID as album ID
                title: releaseGroup.title,
                artistName: artistCredit.name,
                artistId: `${artistCredit.artist.id}`,
                releaseDate: releaseGroup["first-release-date"],
                releaseGroupId: releaseGroup.id,
              };

              console.log(`[MUSICBRAINZ] Adding fallback album to results: "${album.title}" by ${album.artistName}`);
              albums.push(album);
              
              // Cache the album
              console.log(`[MUSICBRAINZ] Caching fallback album for release group ${releaseGroup.id}`);
              await MusicStorage.cacheAlbum(album);
              console.log(`[MUSICBRAINZ] Fallback album cached successfully`);
            }
          }
        }
      }

      // Process artists (if any)
      if (data.artists) {
        for (const artist of data.artists) {
          const artistData: Artist = {
            id: `${artist.id}`,
            name: artist.name,
            country: artist.country,
            disambiguation: artist.disambiguation
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
  static async searchBasic(query: string, limit: number = 10): Promise<any> {
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
              id: `${release.id}`,
              title: release.title,
			  artistName: artistCredit.name,
              artistId: `${artistCredit.artist.id}`,
              releaseDate: release.date
            };

            albums.push(album);
          }
        }
      }

      // Process artists (if any)
      if (data.artists) {
        for (const artist of data.artists) {
          const artistData: Artist = {
            id: `${artist.id}`,
            name: artist.name,
            country: artist.country,
            disambiguation: artist.disambiguation,
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
      .filter(album => album.id && !album.coverArtUrl)
      .map(album => album.id!);
    
    if (releaseIds.length === 0) {
      return;
    }

    try {
      const coverArtMap = await this.getCoverArtUrls(releaseIds);
      
      // Assign cover art URLs to albums
      albums.forEach((album) => {
        const mbid = album.id;
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
    const releaseUrl = `${RELEASE_API_BASE}${mbid}?inc=artist-credits,recordings&fmt=json`;
    
    try {
      const release = await this.makeRequest<MusicBrainzRelease>(releaseUrl);
      
      const artistCredit = release["artist-credit"]?.[0];
      if (!artistCredit) {
        return null;
      }

      const album: Album = {
        id: `${release.id}`,
        title: release.title,
        artistName: artistCredit.name,
        artistId: `${artistCredit.artist.id}`,
        releaseDate: release.date,
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
        id: `${artist.id}`,
        name: artist.name,
        country: artist.country,
        disambiguation: artist.disambiguation,
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
              id: `${release.id}`,
              title: release.title,
              artistName: artistCredit.name,
              artistId: `${artistCredit.artist.id}`,
              releaseDate: release.date,
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
   * Get cover art URL for a release
   */
  static async getCoverArtUrl(mbid: string): Promise<string | null> {
    try {
      console.log(`[MUSICBRAINZ] Getting cover art URL for RELEASE MBID: ${mbid}`);
      
      // First, get the cover art metadata to find the front image
      const metadataUrl = `${COVER_ART_ARCHIVE_BASE}/release/${mbid}`;
	  return metadataUrl;
      console.log(`[MUSICBRAINZ] Fetching cover art metadata from: ${metadataUrl}`);
      
      let response;
      try {
        response = await fetch(metadataUrl, {
          headers: {
            "Accept": "application/json",
            "User-Agent": this.USER_AGENT,
          },
        });
      } catch (fetchError) {
        console.error(`[MUSICBRAINZ] Network error fetching cover art metadata for release ${mbid}:`, fetchError);
        return null;
      }
      
      if (!response.ok) {
        console.warn(`[MUSICBRAINZ] Cover art API returned ${response.status} for release ${mbid}`);
        return null;
      }
      
      let data;
      try {
        data = await response.json();
      } catch (parseError) {
        console.error(`[MUSICBRAINZ] Failed to parse cover art JSON for release ${mbid}:`, parseError);
        return null;
      }
      
      // Find the front image
      const frontImage = data.images?.find((image: any) => image.front);
      let coverArtUrl: string | null = null;
      
      if (frontImage) {
        // Return the thumbnail URL (500px is a good balance)
        coverArtUrl = frontImage.thumbnails?.["500"] || frontImage.image;
        console.log(`[MUSICBRAINZ] Found front cover art for release ${mbid}: ${coverArtUrl}`);
      } else if (data.images && data.images.length > 0) {
        // If no front image is marked, try to get the first image
        const firstImage = data.images[0];
        coverArtUrl = firstImage.thumbnails?.["500"] || firstImage.image;
        console.log(`[MUSICBRAINZ] Using first available cover art for release ${mbid}: ${coverArtUrl}`);
      } else {
        console.log(`[MUSICBRAINZ] No cover art images found for release ${mbid}`);
      }

      let finalUrl = coverArtUrl;
      
      if (coverArtUrl) {
        // Try to download and save to local filesystem
        console.log(`[MUSICBRAINZ] Attempting to download artwork for release ${mbid} from ${coverArtUrl}`);
        try {
          const localPath = await downloadAndSaveArtwork(mbid, coverArtUrl);
          if (localPath) {
            finalUrl = localPath;
            console.log(`[MUSICBRAINZ] Successfully saved local artwork for release ${mbid}: ${localPath}`);
          } else {
            console.log(`[MUSICBRAINZ] Failed to download artwork for release ${mbid}, using external URL: ${coverArtUrl}`);
          }
        } catch (downloadError) {
          console.error(`[MUSICBRAINZ] Error downloading artwork for release ${mbid}:`, downloadError);
          // Continue with external URL if download fails
        }
      }
      
      return finalUrl;
    } catch (error) {
      console.error(`[MUSICBRAINZ] Unexpected error getting cover art for release ${mbid}:`, error);
      // Cache the failure to avoid repeated failed requests
     
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
        id: `${releaseGroup.id}`,
        title: releaseGroup.title,
        artist: artistCredit.name,
        artistId: `${artistCredit.artist.id}`,
        type: releaseGroup.type || releaseGroup["primary-type"],
        firstReleaseDate: releaseGroup["first-release-date"],
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
  static async getReleaseGroupReleases(releaseGroupId: string, limit: number = 5, artistName?: string, artistId?: string): Promise<Album[]> {
    const releasesUrl = `${RELEASE_GROUP_API_BASE}${releaseGroupId}?inc=releases&fmt=json`;
    
    console.log(`[MUSICBRAINZ] Getting releases for release group ${releaseGroupId} with URL: ${releasesUrl}`);
    try {
      const data = await this.makeRequest<MusicBrainzReleaseGroup>(releasesUrl);
      // console.log(`[MUSICBRAINZ] Release group response for ${releaseGroupId}:`, JSON.stringify(data, null, 2));
      
      const albums: Album[] = [];
      
      if (data.releases) {
        console.log(`[MUSICBRAINZ] Found ${data.releases.length} releases in release group ${releaseGroupId}`);
        
        // Sort releases by date to get the earliest/most primary release first
        const sortedReleases = data.releases.sort((a, b) => {
          if (!a.date && !b.date) return 0;
          if (!a.date) return 1;
          if (!b.date) return -1;
          return a.date.localeCompare(b.date);
        });

        // Take only the requested number of releases
        const limitedReleases = sortedReleases.slice(0, limit);
        
        for (const release of limitedReleases) {
          // For release group releases, we need to get artist info from the release group itself
          // since the release objects don't include artist-credit in this API response
          const album: Album = {
            id: `${release.id}`,
            title: release.title,
            artistName: artistName || data.title, // Use provided artist name or fallback to release group title
            artistId: artistId ? `${artistId}` : `${releaseGroupId}`, // Use provided artist ID or fallback
            releaseDate: release.date,
            releaseGroupId: releaseGroupId,
          };

          // Try to get cover art for this release
          try {
            console.log(`[MUSICBRAINZ] Attempting to get cover art for release ${release.id}`);
            const coverArtUrl = await this.getCoverArtUrl(release.id);
            if (coverArtUrl) {
              album.coverArtUrl = coverArtUrl;
              console.log(`[MUSICBRAINZ] Successfully got cover art for release ${release.id}: ${coverArtUrl}`);
            } else {
              console.log(`[MUSICBRAINZ] No cover art found for release ${release.id}`);
            }
          } catch (error) {
            console.warn(`Failed to get cover art for release ${release.id}:`, error);
            // Continue without cover art if it fails
          }

          console.log(`[MUSICBRAINZ] Created album from release: "${album.title}" (ID: ${album.id})`);
          albums.push(album);
        }
      } else {
        console.log(`[MUSICBRAINZ] No releases found in release group ${releaseGroupId}`);
      }

      return albums;
    } catch (error) {
      console.error("Failed to get release group releases:", error);
      return [];
    }
  }
}