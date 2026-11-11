# The Blockchain Wire

**Every blockchain headline, as it happens.** One page for the day's blockchain news, read from the outlets that report it and linked straight back to them.

**Read it:** [theblockchainwire.com](https://theblockchainwire.com)

| | |
| :-- | :-- |
| **What it does** | Reads the public feeds of 13 outlets every two hours and lists headline, source, time and a one-line summary |
| **What it never does** | Copy a full story, rank by hand, show adverts or track readers |
| **Sections** | Regulation, Enterprise, Bitcoin, Ethereum, DeFi, Markets, Industry |
| **From the editor** | Pieces written by [Pratyush Shivam](https://www.pratyushshivam.com), always labelled |
| **Stack** | One Node script, no dependencies, no framework, no backend. Static files only |

## How it works

1. `build.mjs` fetches each feed in `sources.mjs` and keeps the headline, link, time and a short summary.
2. New stories are merged into `data/items.json`, which holds the last 45 days.
3. Each story is filed into a section by keyword rules, so a few will land in the wrong one.
4. The script writes plain HTML into `dist/`: the front page, a page per section, the editor's pieces, an RSS feed and a sitemap.
5. A scheduled GitHub Action runs this every two hours and publishes the result.

## Run it locally

```bash
node build.mjs            # fetch the feeds and build
node build.mjs --offline  # build from the saved archive only
```

Then serve `dist/` with any static file server. Node 20 or newer; nothing to install.

## Writing a piece

Add a Markdown file to `content/editor/` with `title`, `date` and `summary` at the top. It appears on the front page marked "From the editor".

## For publishers

Stories belong to the outlets that reported them. If you would rather not be listed, or should be, open an issue and it will be changed.

MIT licensed.
