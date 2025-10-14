import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { MusicStorage, ReleaseGroup, Album } from "../src/app/lib/music-storage";

describe("Release Group Cache", () => {
  const testReleaseGroup: ReleaseGroup = {
    id: "test_rg_1",
    title: "Test Album",
    artist: "Test Artist",
    artistId: "test_artist_1",
    type: "Album",
    musicBrainzId: "test-mbid-rg-1",
  };

  const testAlbum: Album = {
    id: "test_album_1",
    title: "Test Album",
    artist: "Test Artist",
    artistId: "test_artist_1",
    releaseDate: "2023-01-01",
    trackCount: 10,
    musicBrainzId: "test-mbid-1",
    releaseGroupId: "test-mbid-rg-1",
  };

  beforeAll(async () => {
    // Clean up any existing test data
    await MusicStorage.invalidateAlbum(testAlbum.id);
  });

  afterAll(async () => {
    // Clean up test data
    await MusicStorage.invalidateAlbum(testAlbum.id);
  });

  it("should cache and retrieve release groups", async () => {
    // Cache the release group
    await MusicStorage.cacheReleaseGroup(testReleaseGroup);
    
    // Retrieve the cached release group
    const cached = await MusicStorage.getCachedReleaseGroup(testReleaseGroup.id);
    
    expect(cached).not.toBeNull();
    expect(cached?.id).toBe(testReleaseGroup.id);
    expect(cached?.title).toBe(testReleaseGroup.title);
    expect(cached?.artist).toBe(testReleaseGroup.artist);
  });

  it("should cache and retrieve release groups by MBID", async () => {
    // Cache the release group by MBID
    await MusicStorage.cacheReleaseGroupByMBID(testReleaseGroup.musicBrainzId!, testReleaseGroup);
    
    // Retrieve the cached release group by MBID
    const cached = await MusicStorage.getCachedReleaseGroupByMBID(testReleaseGroup.musicBrainzId!);
    
    expect(cached).not.toBeNull();
    expect(cached?.id).toBe(testReleaseGroup.id);
    expect(cached?.musicBrainzId).toBe(testReleaseGroup.musicBrainzId);
  });

  it("should cache and retrieve releases for a release group", async () => {
    // Cache releases for the release group
    await MusicStorage.cacheReleaseGroupReleases(testReleaseGroup.musicBrainzId!, [testAlbum]);
    
    // Retrieve the cached releases
    const cachedReleases = await MusicStorage.getCachedReleaseGroupReleases(testReleaseGroup.musicBrainzId!);
    
    expect(cachedReleases).not.toBeNull();
    expect(cachedReleases!.length).toBe(1);
    expect(cachedReleases![0].id).toBe(testAlbum.id);
    expect(cachedReleases![0].releaseGroupId).toBe(testAlbum.releaseGroupId);
  });



  it("should include release groups in cache statistics", async () => {
    const stats = await MusicStorage.getCacheStats();
    
    expect(stats.releaseGroups).toBeDefined();
    expect(typeof stats.releaseGroups).toBe("number");
    expect(stats.releaseGroups).toBeGreaterThan(0);
  });
});