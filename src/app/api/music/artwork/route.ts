import { NextRequest, NextResponse } from 'next/server';
import { downloadAndSaveArtwork, localArtworkExists } from '@/app/lib/artwork-storage';
import { MusicBrainzClient } from '@/app/lib/musicbrainz-client';
import fs from 'fs/promises';
import path from 'path';

const ARTWORK_DIR = path.join(process.cwd(), 'public', 'album-art');

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const mbid = searchParams.get('mbid');

    if (!mbid) {
      return NextResponse.json({ error: 'MBID parameter is required' }, { status: 400 });
    }

    console.log(`[ARTWORK API] Fetching artwork for RELEASE MBID: ${mbid}`);

    // Check if local file exists (try common extensions)
    const extensions = ['.jpg', '.png', '.webp'];
    let localPath: string | null = null;
    let extension = '';

    for (const ext of extensions) {
      if (await localArtworkExists(mbid, ext)) {
		console.log(`[/api/music/artwork]: found local artwork!`);
        extension = ext;
        localPath = `/album-art/${mbid}${extension}`;
        break;
      }
    }

    if (localPath) {
      // Serve the local file
      const filePath = path.join(ARTWORK_DIR, `${mbid}${extension}`);
      const buffer = await fs.readFile(filePath);
      
      // Determine content type
      let contentType = 'image/jpeg';
      if (extension === '.png') contentType = 'image/png';
      if (extension === '.webp') contentType = 'image/webp';

      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          'Content-Type': contentType,
          'Content-Length': buffer.length.toString(),
          'Cache-Control': 'public, max-age=604800', // 7 days
        },
      });
    }

    // If not local, try to download and save
    console.log(`[ARTWORK API] No local file found, attempting download for release ${mbid}`);
    const externalUrl = await MusicBrainzClient.getCoverArtUrl(mbid);
    
    if (externalUrl && false) {
      const savedPath = await downloadAndSaveArtwork(mbid, externalUrl);
      if (savedPath) {
        // Extract extension from savedPath
        const filename = path.basename(savedPath);
        const newExtension = path.extname(filename);
        const filePath = path.join(ARTWORK_DIR, filename);
        const buffer = await fs.readFile(filePath);
        
        let contentType = 'image/jpeg';
        if (newExtension === '.png') contentType = 'image/png';
        if (newExtension === '.webp') contentType = 'image/webp';

        return new NextResponse(new Uint8Array(buffer), {
          headers: {
            'Content-Type': contentType,
            'Content-Length': buffer.length.toString(),
            'Cache-Control': 'public, max-age=604800',
          },
        });
      }
    }

    // If still no local file, return external URL or error
    return NextResponse.json({ 
      error: 'Artwork not available', 
      externalUrl: externalUrl || null 
    }, { status: 404 });

  } catch (error) {
    console.error('[ARTWORK API] Error fetching artwork:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}