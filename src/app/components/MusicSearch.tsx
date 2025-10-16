'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';

import type { Album } from '../lib/music-storage';

interface SearchResult {
	albums: Album[];
	artists: any[];
	total: number;
}

interface SearchResponse {
	success: boolean;
	results: SearchResult;
	cached: boolean;
}

interface ArtworkState {
	loading: boolean;
	error: boolean;
	url: string | null;
	retryCount: number;
}

export default function MusicSearch() {
	const [query, setQuery] = useState('');
	const [results, setResults] = useState<Album[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [isCached, setIsCached] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [debouncedQuery, setDebouncedQuery] = useState('');
	const [artworkStates, setArtworkStates] = useState<Map<string, ArtworkState>>(new Map());

	// Debounce the search query
	useEffect(() => {
		const timer = setTimeout(() => {
			setDebouncedQuery(query);
		}, 500);

		return () => {
			clearTimeout(timer);
		};
	}, [query]);

	// Update artwork state for an album
	const updateArtworkState = useCallback((albumId: string, updates: Partial<ArtworkState>) => {
		setArtworkStates(prev => {
			const newMap = new Map(prev);
			const current = newMap.get(albumId) || { loading: false, error: false, url: null, retryCount: 0 };
			newMap.set(albumId, { ...current, ...updates });
			return newMap;
		});
	}, []);

	// Load artwork for an album
	const loadArtwork = useCallback(async (album: Album) => {
		console.log(`[FRONTEND] Loading artwork for album: ${album.id}`);
		updateArtworkState(album.id, { loading: true, error: false, url: null });

		try {
			// Use the album's ID as MBID for the artwork API
			const response = await fetch(`/api/music/artwork?mbid=${album.id}`);

			if (response.ok) {
				// If the response is ok, we have an image
				const imageUrl = `/api/music/artwork?mbid=${album.id}`;
				updateArtworkState(album.id, { loading: false, error: false, url: imageUrl });
				console.log(`[FRONTEND] Artwork loaded successfully for album: ${album.id}`);
			} else {
				// Handle error response
				const errorData = await response.json();
				console.log(`[FRONTEND] Artwork not available for album: ${album.id}`, errorData);
				updateArtworkState(album.id, { loading: false, error: true, url: null });
			}
		} catch (error) {
			console.error(`[FRONTEND] Error loading artwork for album: ${album.id}`, error);
			updateArtworkState(album.id, { loading: false, error: true, url: null });
		}
	}, [updateArtworkState]);

	// Search for albums when debounced query changes
	const searchAlbums = useCallback(async () => {
		console.log(`[FRONTEND] searchAlbums called with query: "${debouncedQuery}"`);

		if (!debouncedQuery.trim()) {
			console.log(`[FRONTEND] Empty query, clearing results`);
			setResults([]);
			setIsCached(false);
			setError(null);
			setArtworkStates(new Map());
			return;
		}

		console.log(`[FRONTEND] Starting search for: "${debouncedQuery}"`);
		setIsLoading(true);
		setError(null);
		// Don't clear artwork states immediately - they'll be updated when new results come in

		try {
			const searchUrl = `/api/music/search?q=${encodeURIComponent(debouncedQuery)}&limit=50`;
			console.log(`[FRONTEND] Fetching from: ${searchUrl}`);
			const response = await fetch(searchUrl);

			console.log(`[FRONTEND] Response status: ${response.status} ${response.statusText}`);

			if (!response.ok) {
				throw new Error(`Search failed: ${response.statusText}`);
			}

			const data: SearchResponse = await response.json();
			console.log(`[FRONTEND] Response data:`, data);

			if (data.success) {
				console.log(`[FRONTEND] Search successful - found ${data.results.albums.length} albums`);
				setResults(data.results.albums);
				setIsCached(data.cached);

				// Load artwork for each album that doesn't already have a loaded state
				data.results.albums.forEach(album => {
					// Check if we already have a loaded state for this album
					const currentState = artworkStates.get(album.id);
					if (!currentState || (!currentState.url && !currentState.loading)) {
						loadArtwork(album);
					}
				});
			} else {
				console.log(`[FRONTEND] Search unsuccessful:`, data);
				throw new Error('Search returned unsuccessful result');
			}
		} catch (err) {
			console.error(`[FRONTEND] Search error:`, err);
			setError(err instanceof Error ? err.message : 'An unknown error occurred');
			setResults([]);
		} finally {
			console.log(`[FRONTEND] Search completed, setting isLoading to false`);
			setIsLoading(false);
		}
	}, [debouncedQuery, loadArtwork]);

	useEffect(() => {
		searchAlbums();
	}, [searchAlbums]);

	// Clean up artwork states for albums that are no longer in the results
	useEffect(() => {
		if (results.length > 0) {
			const resultIds = new Set(results.map(album => album.id));
			setArtworkStates(prev => {
				const newStates = new Map<string, ArtworkState>();
				prev.forEach((state, albumId) => {
					if (resultIds.has(albumId)) {
						newStates.set(albumId, state);
					}
				});
				return newStates;
			});
		}
	}, [results]);

	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setQuery(e.target.value);
	};

	// Enhanced album item component with artwork states
	const AlbumItem = ({ album, isResultCached }: { album: Album; isResultCached: boolean }) => {
		const [imageError, setImageError] = useState(false);
		const artworkState = artworkStates.get(album.id) || { loading: false, error: false, url: null, retryCount: 0 };

		const handleImageError = () => {
			setImageError(true);
			// Retry loading artwork if we haven't exceeded retry count
			if (artworkState.retryCount < 2) {
				updateArtworkState(album.id, { retryCount: artworkState.retryCount + 1 });
				// Create a new function to avoid circular dependency
				(async () => {
					console.log(`[FRONTEND] Retrying artwork for album: ${album.id} (attempt ${artworkState.retryCount + 1})`);
					updateArtworkState(album.id, { loading: true, error: false, url: null });

					try {
						const response = await fetch(`/api/music/artwork?mbid=${album.id}`);
						if (response.ok) {
							const imageUrl = `/api/music/artwork?mbid=${album.id}`;
							updateArtworkState(album.id, { loading: false, error: false, url: imageUrl });
							console.log(`[FRONTEND] Artwork retry successful for album: ${album.id}`);
						} else {
							updateArtworkState(album.id, { loading: false, error: true, url: null });
						}
					} catch (error) {
						console.error(`[FRONTEND] Error retrying artwork for album: ${album.id}`, error);
						updateArtworkState(album.id, { loading: false, error: true, url: null });
					}
				})();
			}
		};

		const getDisplayUrl = () => {
			if (imageError || artworkState.error) return null;
			if (artworkState.url) return artworkState.url;
			// Don't fall back to coverArtUrl since we're using the API
			return null;
		};

		const displayUrl = getDisplayUrl();

		return (
			<div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-all duration-200">
				<div className="aspect-square bg-gray-200 relative">
					{artworkState.loading ? (
						<div className="w-full h-full flex flex-col items-center justify-center bg-gray-100 p-4">
							<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-2"></div>
							<span className="text-xs text-gray-500 text-center">
								{isResultCached ? 'Finding artwork...' : 'Loading artwork...'}
							</span>
						</div>
					) : displayUrl ? (
						<img
							src={displayUrl}
							alt={`${album.title} cover art`}
							className="w-full h-full object-cover"
							onError={handleImageError}
						/>
					) : (
						<div className="w-full h-full flex flex-col items-center justify-center bg-gray-100 p-4">
							{artworkState.error && artworkState.retryCount < 2 ? (
								<></>
							) : (
								<>
									<svg className="w-12 h-12 text-gray-400 mb-2" fill="currentColor" viewBox="0 0 20 20">
										<path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
									</svg>
									<span className="text-xs text-gray-500 text-center">
										{artworkState.error ? 'Failed to load' : 'No Cover'}
									</span>
								</>
							)}
						</div>
					)
					}
				</div >
				<div className="p-4">
					<h3 className="font-semibold text-gray-900 truncate mb-1" title={album.title}>
						{album.title}
					</h3>
					<p className="text-sm text-gray-600 truncate mb-2" title={album.artistName}>
						{album.artistName}
					</p>
					<div className="flex items-center justify-between">
						<div className="flex items-center space-x-2">
							{isResultCached ? (
								<span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
									<svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
										<path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
									</svg>
									Cached
								</span>
							) : (
								<span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
									<svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
										<path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
									</svg>
									Live
								</span>
							)}
						</div>
						{album.releaseDate && (
							<span className="text-xs text-gray-500">
								{new Date(album.releaseDate).getFullYear()}
							</span>
						)}
					</div>
				</div>
			</div >
		);
	};

	return (
		<div className="w-full max-w-4xl mx-auto p-4">
			<div className="mb-6">
				<div className="relative">
					<input
						type="text"
						value={query}
						onChange={handleInputChange}
						placeholder="Search for albums..."
						className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
					/>
					{isLoading && (
						<div className="absolute right-3 top-2.5">
							<div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
						</div>
					)}
				</div>
			</div>

			{error && (
				<div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-md">
					{error}
				</div>
			)}

			{results.length > 0 && (
				<div className="mb-4 flex flex-wrap gap-2 text-sm">
					{isCached ? (
						<span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
							<svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
								<path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
							</svg>
							Cached Results
						</span>
					) : (
						<span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
							<svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
								<path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
							</svg>
							Live from MusicBrainz
						</span>
					)}

					{!isCached && (
						<span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 border border-purple-200">
							<svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
								<path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
							</svg>
							Exact Match
						</span>
					)}
				</div>
			)}

			<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
				{results.map((album) => (
					<AlbumItem
						key={album.id}
						album={album}
						isResultCached={isCached}
					/>
				))}
			</div>

			{!isLoading && query && results.length === 0 && !error && (
				<div className="text-center py-8 text-gray-500">
					No albums found for "{query}"
				</div>
			)}
		</div>
	);
}