import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const query = searchParams.get("q");
		const limitParam = searchParams.get("limit");

		console.log(
			`[UNIFIED SEARCH] Search request received - query: "${query}", limit: ${limitParam}`
		);

		// Validate query parameter
		if (!query || query.trim() === "") {
			console.log(`[UNIFIED SEARCH] Empty query received`);
			return NextResponse.json(
				{ error: "Query parameter 'q' is required and cannot be empty" },
				{ status: 400 }
			);
		}

		// Parse and validate limit parameter
		let limit = 50; // Default limit
		if (limitParam) {
			const parsedLimit = parseInt(limitParam, 10);
			if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 50) {
				return NextResponse.json(
					{ error: "Limit parameter must be a number between 1 and 50" },
					{ status: 400 }
				);
			}
			limit = parsedLimit;
		}

		// First, try Redis search
		console.log(`[UNIFIED SEARCH] Trying Redis search first`);
		try {
			const redisUrl = new URL(`/api/music/search/redis`, request.url);
			redisUrl.searchParams.set("q", query);
			redisUrl.searchParams.set("limit", limit.toString());

			const redisResponse = await fetch(redisUrl.toString());

			if (redisResponse.ok) {
				const redisData = await redisResponse.json();
				console.log(
					`[UNIFIED SEARCH] Redis search successful - found ${redisData.results.albums.length} albums, ${redisData.results.artists.length} artists`
				);

				// If Redis found results, return them
				if (
					redisData.results.albums.length > 0 ||
					redisData.results.artists.length > 0
				) {
					return NextResponse.json(redisData);
				} else {
					console.log(
						`[UNIFIED SEARCH] Redis search found no results, trying MusicBrainz`
					);
				}
			} else {
				console.log(
					`[UNIFIED SEARCH] Redis search failed with status ${redisResponse.status}, trying MusicBrainz`
				);
			}
		} catch (error) {
			console.error(`[UNIFIED SEARCH] Redis search error:`, error);
			console.log(`[UNIFIED SEARCH] Falling back to MusicBrainz search`);
		}


		// If Redis didn't find results or failed, try MusicBrainz search
		console.log(`[UNIFIED SEARCH] Trying MusicBrainz search`);
		try {
			const musicbrainzUrl = new URL(
				`/api/music/search/musicbrainz`,
				request.url
			);
			musicbrainzUrl.searchParams.set("q", query);
			musicbrainzUrl.searchParams.set("limit", limit.toString());

			const musicbrainzResponse = await fetch(musicbrainzUrl.toString());

			if (musicbrainzResponse.ok) {
				const musicbrainzData = await musicbrainzResponse.json();
				console.log(
					`[UNIFIED SEARCH] MusicBrainz search successful - found ${musicbrainzData.results.albums.length} albums, ${musicbrainzData.results.artists.length} artists`
				);

				// rerturn the response
				return NextResponse.json(musicbrainzData);
			} else {
				console.error(
					`[UNIFIED SEARCH] MusicBrainz search failed with status ${musicbrainzResponse.status}`
				);
				const errorData = await musicbrainzResponse.json().catch(() => ({}));
				return NextResponse.json(
					{ error: errorData.error || "MusicBrainz search failed" },
					{ status: musicbrainzResponse.status }
				);
			}
		} catch (error) {
			console.error(`[UNIFIED SEARCH] MusicBrainz search error:`, error);
			return NextResponse.json(
				{ error: "Both Redis and MusicBrainz searches failed" },
				{ status: 500 }
			);
		}
	} catch (error) {
		console.error("[UNIFIED SEARCH] Search error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}
