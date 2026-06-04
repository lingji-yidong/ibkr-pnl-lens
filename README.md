# IBKR 盈虧比計算器

Fully offline IBKR Flex XML analyzer for profit factor, payoff ratio, realized P/L, auto-expiry risk, and trade discipline review.

## Features

- Upload IBKR Flex XML locally in the browser
- No LLM, no API key, no network analysis calls
- Masks account identifiers in the UI
- Separates executions from canceled orders when the XML includes order records
- Includes option auto-expiry (`Ep`) in closed trade analysis
- Built for Cloudflare Pages static deployment

## Local Development

```bash
npm install
npm run dev
```

## Test

```bash
npm test
```

## Build

```bash
npm run build
```

Cloudflare Pages settings:

- Build command: `npm run build`
- Output directory: `dist`
- Node version: `20`

## GitHub + Cloudflare Pages

```bash
git init
git add .
git commit -m "Initial offline IBKR Flex XML analyzer"
git branch -M main
git remote add origin <your-github-repo-url>
git push -u origin main
```

Then connect the GitHub repo in Cloudflare Pages with the build settings above.
