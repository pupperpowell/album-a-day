import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { ListeningEntries } from "../src/app/lib/listening-entries";
import { getRedisClient } from "../src/app/lib/redis-client";

const client = getRedisClient();

describe("ListeningEntries", () => {
  const testUsername = "testuser";
  const testDate = "2025-01-15";
  const testAlbumMbid = "test-mbid-123";
  const testRating = 8.5;
  const testFavoriteTrack = "Test Track";
  const testNotes = "Great album, loved the atmosphere";

  beforeEach(async () => {
    // Clean up any existing test data
    const keys = await client.keys(`listening:${testUsername}:*`);
    if (keys.length > 0) {
      await client.del(...keys);
    }
  });

  afterEach(async () => {
    // Clean up test data
    const keys = await client.keys(`listening:${testUsername}:*`);
    if (keys.length > 0) {
      await client.del(...keys);
    }
  });

  describe("addOrUpdateListeningEntry", () => {
    it("should create a new listening entry", async () => {
      const entry = await ListeningEntries.addOrUpdateListeningEntry(
        testUsername,
        testDate,
        testAlbumMbid,
        testRating,
        testFavoriteTrack,
        testNotes
      );

      expect(entry).toBeDefined();
      expect(entry.username).toBe(testUsername);
      expect(entry.date).toBe(testDate);
      expect(entry.album_mbid).toBe(testAlbumMbid);
      expect(entry.rating).toBe(testRating);
      expect(entry.favorite_track).toBe(testFavoriteTrack);
      expect(entry.notes).toBe(testNotes);
      expect(entry.created_at).toBeDefined();
      expect(entry.updated_at).toBeDefined();
    });

    it("should update an existing listening entry", async () => {
      // Create initial entry
      await ListeningEntries.addOrUpdateListeningEntry(
        testUsername,
        testDate,
        testAlbumMbid,
        testRating,
        testFavoriteTrack,
        testNotes
      );

      // Update with new data
      const updatedRating = 9.0;
      const updatedNotes = "Even better on second listen";
      
      const updatedEntry = await ListeningEntries.addOrUpdateListeningEntry(
        testUsername,
        testDate,
        testAlbumMbid,
        updatedRating,
        testFavoriteTrack,
        updatedNotes
      );

      expect(updatedEntry.rating).toBe(updatedRating);
      expect(updatedEntry.notes).toBe(updatedNotes);
      expect(updatedEntry.created_at).toBeDefined();
      expect(updatedEntry.updated_at).toBeDefined();
      expect(updatedEntry.updated_at).not.toBe(updatedEntry.created_at);
    });
  });

  describe("getListeningEntry", () => {
    it("should retrieve an existing listening entry", async () => {
      // Create entry
      await ListeningEntries.addOrUpdateListeningEntry(
        testUsername,
        testDate,
        testAlbumMbid,
        testRating,
        testFavoriteTrack,
        testNotes
      );

      // Retrieve entry
      const retrievedEntry = await ListeningEntries.getListeningEntry(
        testUsername,
        testDate
      );

      expect(retrievedEntry).toBeDefined();
      expect(retrievedEntry!.username).toBe(testUsername);
      expect(retrievedEntry!.date).toBe(testDate);
      expect(retrievedEntry!.album_mbid).toBe(testAlbumMbid);
      expect(retrievedEntry!.rating).toBe(testRating);
    });

    it("should return null for non-existent entry", async () => {
      const entry = await ListeningEntries.getListeningEntry(
        testUsername,
        "2025-12-25"
      );

      expect(entry).toBeNull();
    });
  });

  describe("getAllUserEntries", () => {
    it("should return all entries for a user", async () => {
      // Create multiple entries
      await ListeningEntries.addOrUpdateListeningEntry(
        testUsername,
        "2025-01-15",
        testAlbumMbid,
        testRating,
        testFavoriteTrack,
        testNotes
      );

      await ListeningEntries.addOrUpdateListeningEntry(
        testUsername,
        "2025-01-16",
        "test-mbid-456",
        7.5,
        "Another Track",
        "Good album"
      );

      const entries = await ListeningEntries.getAllUserEntries(testUsername);

      expect(entries).toHaveLength(2);
      expect(entries[0].date).toBe("2025-01-16"); // Newest first
      expect(entries[1].date).toBe("2025-01-15");
    });

    it("should return empty array for user with no entries", async () => {
      const entries = await ListeningEntries.getAllUserEntries("nonexistentuser");
      expect(entries).toHaveLength(0);
    });
  });

  describe("deleteListeningEntry", () => {
    it("should delete an existing entry", async () => {
      // Create entry
      await ListeningEntries.addOrUpdateListeningEntry(
        testUsername,
        testDate,
        testAlbumMbid,
        testRating,
        testFavoriteTrack,
        testNotes
      );

      // Verify entry exists
      const entry = await ListeningEntries.getListeningEntry(testUsername, testDate);
      expect(entry).toBeDefined();

      // Delete entry
      const deleted = await ListeningEntries.deleteListeningEntry(
        testUsername,
        testDate
      );
      expect(deleted).toBe(true);

      // Verify entry is gone
      const deletedEntry = await ListeningEntries.getListeningEntry(
        testUsername,
        testDate
      );
      expect(deletedEntry).toBeNull();
    });

    it("should return false when trying to delete non-existent entry", async () => {
      const deleted = await ListeningEntries.deleteListeningEntry(
        testUsername,
        "2025-12-25"
      );
      expect(deleted).toBe(false);
    });
  });

  describe("validateRating", () => {
    it("should validate correct ratings", () => {
      expect(ListeningEntries.validateRating(0)).toBe(true);
      expect(ListeningEntries.validateRating(5)).toBe(true);
      expect(ListeningEntries.validateRating(10)).toBe(true);
      expect(ListeningEntries.validateRating(7.5)).toBe(true);
    });

    it("should reject invalid ratings", () => {
      expect(ListeningEntries.validateRating(-1)).toBe(false);
      expect(ListeningEntries.validateRating(11)).toBe(false);
      expect(ListeningEntries.validateRating(NaN)).toBe(false);
      expect(ListeningEntries.validateRating(Infinity)).toBe(false);
    });
  });

  describe("validateDate", () => {
    it("should validate correct date formats", () => {
      expect(ListeningEntries.validateDate("2025-01-15")).toBe(true);
      expect(ListeningEntries.validateDate("2024-12-31")).toBe(true);
      expect(ListeningEntries.validateDate("2023-02-28")).toBe(true);
    });

    it("should reject invalid date formats", () => {
      expect(ListeningEntries.validateDate("2025-1-15")).toBe(false);
      expect(ListeningEntries.validateDate("25-01-15")).toBe(false);
      expect(ListeningEntries.validateDate("2025-01-32")).toBe(false);
      expect(ListeningEntries.validateDate("invalid-date")).toBe(false);
    });
  });

  describe("isDateInFuture", () => {
    it("should identify future dates", () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      const futureDateStr = futureDate.toISOString().split('T')[0];
      
      expect(ListeningEntries.isDateInFuture(futureDateStr)).toBe(true);
    });

    it("should allow today and past dates", () => {
      const today = new Date().toISOString().split('T')[0];
      const pastDate = "2020-01-01";
      
      expect(ListeningEntries.isDateInFuture(today)).toBe(false);
      expect(ListeningEntries.isDateInFuture(pastDate)).toBe(false);
    });
  });
});