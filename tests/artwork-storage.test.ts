import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { downloadAndSaveArtwork, artworkExists, getArtworkPublicUrl, ensureArtworkDir } from '../src/app/lib/artwork-storage';
import { MusicBrainzClient } from '../src/app/lib/musicbrainz-client';
import { MusicStorage } from '../src/app/lib/music-storage';
import fs from 'fs/promises';
import path from 'path';

const TEST_MBID = '76df3287-6cda-33eb-8e9a-044b5e15ffdd'; // Abbey Road - Beatles
const TEST_ARTWORK_URL = 'https://coverartarchive.org/release/76df3287-6cda-33eb-8e9a-044b5e15ffdd/829521842-500.jpg';
const ARTWORK_DIR = path.join(process.cwd(), 'public', 'album-art');

describe('Artwork Storage', () => {
  beforeEach(async () => {
    // Clean up any existing test files
    try {
      const files = await fs.readdir(ARTWORK_DIR);
      for (const file of files) {
        if (file.includes(TEST_MBID)) {
          await fs.unlink(path.join(ARTWORK_DIR, file));
        }
      }
    } catch (error) {
      // Directory doesn't exist, that's fine
    }
  });

  afterEach(async () => {
    // Clean up test files
    try {
      const files = await fs.readdir(ARTWORK_DIR);
      for (const file of files) {
        if (file.includes(TEST_MBID)) {
          await fs.unlink(path.join(ARTWORK_DIR, file));
        }
      }
    } catch (error) {
      // Directory doesn't exist, that's fine
    }
  });

  describe('ensureArtworkDir', () => {
    it('should create the artwork directory', async () => {
      await ensureArtworkDir();
      
      const exists = await fs.access(ARTWORK_DIR).then(() => true).catch(() => false);
      expect(exists).toBe(true);
    });
  });

  describe('downloadAndSaveArtwork', () => {
    it('should download and save artwork successfully', async () => {
      const result = await downloadAndSaveArtwork(TEST_MBID, TEST_ARTWORK_URL);
      
      expect(result).toBeTruthy();
      expect(result).toContain('/album-art/');
      expect(result).toContain(TEST_MBID);
      
      // Verify file exists
      if (result) {
        const filename = path.basename(result);
        const filePath = path.join(ARTWORK_DIR, filename);
        const exists = await fs.access(filePath).then(() => true).catch(() => false);
        expect(exists).toBe(true);
      }
      
      // Verify file has content
      if (result) {
        const filename = path.basename(result);
        const filePath = path.join(ARTWORK_DIR, filename);
        const stats = await fs.stat(filePath);
        expect(stats.size).toBeGreaterThan(0);
      }
    });

    it('should return null for invalid URL', async () => {
      const result = await downloadAndSaveArtwork(TEST_MBID, 'https://this-domain-absolutely-does-not-exist-12345.com/image.jpg');
      expect(result).toBeNull();
    });

    it('should handle different image formats', async () => {
      // Test with PNG URL if available
      const pngUrl = 'https://coverartarchive.org/release/76df3287-6cda-33eb-8e9a-044b5e15ffdd/829521842';
      const result = await downloadAndSaveArtwork(TEST_MBID, pngUrl);
      
      if (result) {
        const hasValidExtension = result.includes('.png') || result.includes('.jpg');
        expect(hasValidExtension).toBe(true);
        
        // Verify file exists
        const filename = path.basename(result);
        const filePath = path.join(ARTWORK_DIR, filename);
        const exists = await fs.access(filePath).then(() => true).catch(() => false);
        expect(exists).toBe(true);
      }
    });
  });

  describe('artworkExists', () => {
    it('should return false for non-existent artwork', async () => {
      const exists = await artworkExists(TEST_MBID, '.jpg');
      expect(exists).toBe(false);
    });

    it('should return true for existing artwork', async () => {
      // First download the artwork
      await downloadAndSaveArtwork(TEST_MBID, TEST_ARTWORK_URL);
      
      // Then check if it exists
      const exists = await artworkExists(TEST_MBID, '.jpg');
      expect(exists).toBe(true);
    });
  });

  describe('getArtworkPublicUrl', () => {
    it('should generate correct public URL', () => {
      const url = getArtworkPublicUrl(TEST_MBID, '.jpg');
      expect(url).toBe('/album-art/76df3287-6cda-33eb-8e9a-044b5e15ffdd.jpg');
    });
  });
});

describe('MusicBrainzClient Integration', () => {
  beforeEach(async () => {
    // Clear cache for test MBID
    await MusicStorage.cacheCoverArt(TEST_MBID, '');
  });

  it('should download and cache artwork when getting cover art URL', async () => {
    const coverArtUrl = await MusicBrainzClient.getCoverArtUrl(TEST_MBID);
    
    expect(coverArtUrl).toBeTruthy();
    
    // Should be a local path if download succeeded
    if (coverArtUrl && coverArtUrl.startsWith('/album-art/')) {
      // Verify file exists
      const filename = path.basename(coverArtUrl);
      const filePath = path.join(ARTWORK_DIR, filename);
      const exists = await fs.access(filePath).then(() => true).catch(() => false);
      expect(exists).toBe(true);
    }
    
    // Verify it's cached
    const cachedUrl = await MusicStorage.getCachedCoverArt(TEST_MBID);
    expect(cachedUrl).toBe(coverArtUrl);
  });

  it('should return cached local path on subsequent calls', async () => {
    // First call
    const firstCall = await MusicBrainzClient.getCoverArtUrl(TEST_MBID);
    
    // Second call should return cached result
    const secondCall = await MusicBrainzClient.getCoverArtUrl(TEST_MBID);
    
    expect(firstCall).toBe(secondCall);
  });
});

describe('Search Integration', () => {
  it('should download artwork during album search', async () => {
    // Search for an album that should have artwork
    const searchResults = await MusicBrainzClient.search('Beatles Abbey Road', 1);
    
    expect(searchResults.albums).toHaveLength(1);
    expect(searchResults.albums[0].musicBrainzId).toBeTruthy();
    
    const album = searchResults.albums[0];
    
    // Check if artwork was downloaded (may not always succeed due to external service)
    if (album.coverArtUrl && album.coverArtUrl.startsWith('/album-art/')) {
      const filename = path.basename(album.coverArtUrl);
      const filePath = path.join(ARTWORK_DIR, filename);
      const exists = await fs.access(filePath).then(() => true).catch(() => false);
      expect(exists).toBe(true);
    }
  });
});