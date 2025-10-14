# MusicBrainz API

## To search for albums:

https://musicbrainz.org/ws/2/release/?query=SAGITARIO&limit=20&fmt=json

which responds with, for example:

```json
{
  "created": "2025-10-13T22:25:43.599Z",
  "count": 9,
  "offset": 0,
  "releases": [
    // other releases...
    {
      "id": "8e4de7b3-e107-4545-a5ce-7190086b1f2b",
      "score": 100,
      "status-id": "4e304316-386d-3409-af2e-78857eec5cfe",
      "artist-credit-id": "c78a2c39-582f-3851-96f6-a9a25d1a8e12",
      "count": 1,
      "title": "SAGITARIO",
      "status": "Official",
      "text-representation": {
        "language": "spa"
      },
      "artist-credit": [
        {
          "name": "El Alfa",
          "artist": {
            "id": "0887484d-aed1-4aa6-9862-930a25815696",
            "name": "El Alfa",
            "sort-name": "Alfa, El"
          }
        }
      ],
      "release-group": {
        "id": "82e628de-9a27-402a-9ca5-94280de00c0d",
        "type-id": "f529b476-6e62-324f-b0aa-1f3e33d313fc",
        "primary-type-id": "f529b476-6e62-324f-b0aa-1f3e33d313fc",
        "title": "SAGITARIO",
        "primary-type": "Album"
      },
      "date": "2022-11-22",
      "country": "XW",
      "release-events": [
        {
          "date": "2022-11-22",
          "area": {
            "id": "525d4e18-3d00-31b9-a58b-a146a916de8f",
            "name": "[Worldwide]",
            "sort-name": "[Worldwide]",
            "iso-3166-1-codes": ["XW"]
          }
        }
      ],
      "label-info": [
        {
          "label": {
            "id": "28c65844-7849-4a01-92c6-612361964330",
            "name": "El Jefe Records"
          }
        }
      ],
      "track-count": 18,
      "media": [
        {
          "id": "258996e8-c56f-3676-bcbb-ae9357eb1a61",
          "format": "CD",
          "disc-count": 0,
          "track-count": 18
        }
      ]
    }
    // ... other releases
  ]
}
```

Note: "primary-type" should be "Album" or "EP". Other values indicate the particular release is not relevant to this application and should be discarded.

## To find information on albums with known MBIDs:

https://musicbrainz.org/ws/2/release/8e4de7b3-e107-4545-a5ce-7190086b1f2b?inc=recordings&fmt=json

Which responds with, for example:

```json
{
  "date": "2022-11-22",
  "cover-art-archive": {
    "artwork": true,
    "back": false,
    "front": true,
    "count": 1,
    "darkened": false
  },
  "packaging": null,
  "id": "8e4de7b3-e107-4545-a5ce-7190086b1f2b",
  "status": "Official",
  "status-id": "4e304316-386d-3409-af2e-78857eec5cfe",
  "quality": "normal",
  "media": [
    {
      "track-offset": 0,
      "title": "",
      "format": "CD",
      "tracks": [
        {
          "id": "094dcac7-a66e-420e-8508-0dd01bc18377",
          "position": 1,
          "length": null,
          "recording": {
            "title": "Suénala",
            "video": false,
            "disambiguation": "",
            "length": null,
            "id": "1b1716c0-1e04-49d5-9f9f-9bdd7bc5e1d8",
            "first-release-date": "2022-11-22"
          },
          "number": "1",
          "title": "Suénala"
        },
        {
          "title": "El Tubo",
          "number": "2",
          "id": "83fadd6c-3f6c-485e-b82d-95ce3598807c",
          "recording": {
            "disambiguation": "",
            "title": "El Tubo",
            "video": false,
            "length": null,
            "id": "4a0015b9-27c3-4b02-a94e-b09a9c2be80a",
            "first-release-date": "2022-11-22"
          },
          "length": null,
          "position": 2
        },
        // more tracks....
        {
          "number": "18",
          "title": "Curazao",
          "position": 18,
          "length": null,
          "recording": {
            "video": false,
            "title": "Curazao",
            "disambiguation": "",
            "first-release-date": "2021-09-07",
            "id": "209edb68-f50e-436e-83aa-d7ecff9f07bc",
            "length": 239578
          },
          "id": "518c4c72-4fb8-4a55-a1ff-71375893ce16"
        }
      ],
      "id": "258996e8-c56f-3676-bcbb-ae9357eb1a61",
      "track-count": 18,
      "position": 1,
      "format-id": "9712d52a-4509-3d4b-a1a2-67c88c643e31"
    }
  ],
  "country": "XW",
  "release-events": [
    {
      "area": {
        "name": "[Worldwide]",
        "id": "525d4e18-3d00-31b9-a58b-a146a916de8f",
        "type": null,
        "iso-3166-1-codes": ["XW"],
        "type-id": null,
        "disambiguation": "",
        "sort-name": "[Worldwide]"
      },
      "date": "2022-11-22"
    }
  ],
  "asin": null,
  "text-representation": { "language": "spa", "script": null },
  "title": "SAGITARIO",
  "barcode": null,
  "packaging-id": null,
  "disambiguation": ""
}
```

## To find album cover artwork for albums with known MBIDs:

http://coverartarchive.org/release/8e4de7b3-e107-4545-a5ce-7190086b1f2b

Which returns, for example:

```json
{
  "images": [
    {
      "approved": true,
      "back": false,
      "comment": "",
      "edit": 99903063,
      "front": true,
      "id": 35716341911,
      "image": "http://coverartarchive.org/release/8e4de7b3-e107-4545-a5ce-7190086b1f2b/35716341911.jpg",
      "thumbnails": {
        "1200": "http://coverartarchive.org/release/8e4de7b3-e107-4545-a5ce-7190086b1f2b/35716341911-1200.jpg",
        "250": "http://coverartarchive.org/release/8e4de7b3-e107-4545-a5ce-7190086b1f2b/35716341911-250.jpg",
        "500": "http://coverartarchive.org/release/8e4de7b3-e107-4545-a5ce-7190086b1f2b/35716341911-500.jpg",
        "large": "http://coverartarchive.org/release/8e4de7b3-e107-4545-a5ce-7190086b1f2b/35716341911-500.jpg",
        "small": "http://coverartarchive.org/release/8e4de7b3-e107-4545-a5ce-7190086b1f2b/35716341911-250.jpg"
      },
      "types": ["Front"]
    }
  ],
  "release": "https://musicbrainz.org/release/8e4de7b3-e107-4545-a5ce-7190086b1f2b"
}
```

Save both the main "image" and the "500" thumbnail to the local filesystem.
