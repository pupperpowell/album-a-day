import fs from 'fs/promises';
import path from 'path';

const ARTWORK_DIR = path.join(process.cwd(), 'public', 'album-art');

export async function ensureArtworkDir(): Promise<void> {
  try {
    await fs.mkdir(ARTWORK_DIR, { recursive: true });
    console.log('[ARTWORK STORAGE] Artwork directory ensured at:', ARTWORK_DIR);
  } catch (err) {
    console.error('[ARTWORK STORAGE] Failed to create artwork directory:', err);
  }
}

export async function downloadAndSaveArtwork(mbid: string, url: string): Promise<string | null> {
  try {
    await ensureArtworkDir();

    console.log(`[ARTWORK STORAGE] Downloading artwork for RELEASE MBID: ${mbid} from URL: ${url}`);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'AlbumADay/0.0.1 (https://github.com/pupperpowell/album-a-day)'
      }
    });

    if (!response.ok) {
      console.warn(`[ARTWORK STORAGE] HTTP error ${response.status} for ${mbid}`);
      return null;
    }

    const buffer = await response.arrayBuffer();

    // Determine file extension from content-type or URL
    const contentType = response.headers.get('content-type') || '';
    let extension = '.jpg'; // default

    if (contentType.includes('png')) {
      extension = '.png';
    } else if (contentType.includes('webp')) {
      extension = '.webp';
    } else if (contentType.includes('jpeg') || contentType.includes('jpg')) {
      extension = '.jpg';
    } else {
      // Fallback to URL extension
      const urlObj = new URL(url);
      const urlExt = path.extname(urlObj.pathname);
      if (urlExt) {
        extension = urlExt.toLowerCase();
      }
    }

    const filename = `${mbid}${extension}`;
    const filePath = path.join(ARTWORK_DIR, filename);

    await fs.writeFile(filePath, Buffer.from(buffer));

    const publicPath = `/album-art/${filename}`;
    console.log(`[ARTWORK STORAGE] Successfully saved artwork for release ${mbid} at ${publicPath}`);
    return publicPath;
  } catch (error) {
    console.error(`[ARTWORK STORAGE] Failed to download and save artwork for release ${mbid}:`, error);
    return null;
  }
}

export async function localArtworkExists(mbid: string, extension: string = '.jpg'): Promise<boolean> {
  try {
    const filePath = path.join(ARTWORK_DIR, `${mbid}${extension}`);
    await fs.access(filePath);
	console.log(`[LOCAL ARTWORK]: Local file found!`);
    return true;
  } catch {
	console.log(`[LOCAL ARTWORK]: No artwork found`);
    return false;
  }
}