# Personal site

A static personal website built with [Astro](https://astro.build). All content lives in this repository, except for photos stored in Cloudflare R2.

## Run it

Requires Node 24 (see `.nvmrc`).

```bash
npm install
npm run dev
```

The site runs at http://localhost:4321.

## Edit content

| Content | Location |
| --- | --- |
| Name, intro, navigation, links | `src/site.config.ts` |
| Resume blocks on the home page | `src/content/resume.yaml` |
| Projects | `src/content/projects/*.md` |
| Blog posts | `src/content/blog/*.{md,mdx}` |
| Photo albums | `src/content/photos/*.yaml` (generated) |

A project page is created only if its Markdown file has a body. Otherwise, its card links to `url` or `repo`.

Posts with `draft: true` appear in `npm run dev` but not in production builds.

## Add photos

```bash
npm run photos -- ./path/to/folder --album kyoto --title "Kyoto" --date 2026-04
```

The script resizes each photo to 800px and 2000px WebP files and removes all metadata, including GPS location. HEIC files are not supported, so convert them to JPEG first.

Add alt text in the generated album file. Running the script again keeps existing alt text and adds new photos to the album.

To upload to R2, copy `.env.example` to `.env` and fill in every value. Without those values, photos go to `public/photos`.

## Sync photos from Unsplash

1. Register an application at https://unsplash.com/oauth/applications. Its name can't include "Unsplash".
2. Copy `.env.example` to `.env`, then set `UNSPLASH_ACCESS_KEY` and `UNSPLASH_APP_NAME`.
3. Sync the photos, then commit `src/content/photos/unsplash.yaml`:

```bash
npm run photos:unsplash
```

Run the sync again whenever you publish new photos. Builds read the committed file, so the hosting provider doesn't need the key. Never commit the key.

## Add a section

1. Define a collection in `src/content.config.ts`.
2. Add a page in `src/pages/`.
3. Add a link to `nav` in `src/site.config.ts`.

## Deploy to Cloudflare Pages

Connect the repository with these settings:

- **Build command:** `npm run build`
- **Output directory:** `dist`
- **Environment variable:** `SITE_URL`, set to the final site URL

`SITE_URL` sets the canonical, RSS, and sitemap URLs. Without it, those URLs point to localhost.
