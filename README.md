# IBKR PnL Lens

Fully offline IBKR Flex XML analyzer for profit factor, payoff ratio, realized P/L, option auto-expiry risk, and trade discipline review.

This project is designed for traders who want a quick, private review of their Interactive Brokers activity data without sending statements, account identifiers, or API keys to any external service.

## Features

- Upload an IBKR Flex XML file directly in the browser.
- Fully offline analysis: no LLM, no API key, no backend, no analytics API.
- Masks account identifiers in the UI.
- Separates executions from canceled orders when the XML includes order records.
- Includes option auto-expiry (`Ep`) in closed trade analysis instead of dropping it as noise.
- Reports profit factor, payoff ratio, win rate, expectancy, commissions, daily realized P/L, symbol impact, and rule-based discipline notes.
- Built for static hosting on Cloudflare Pages.

## Data Format

The app supports **IBKR Flex XML** only. CSV support was intentionally removed because ordinary IBKR activity CSV exports are multi-section reports with repeated headers and duplicated field names, which makes them fragile for analysis.

Recommended Flex Query sections:

- Account Information
- Trades
- Closed Lots
- Orders / Order History, if you want canceled order analysis

The current analyzer uses `<Trade>` records as execution records and `<Lot>` records as supporting lot detail. If your Flex XML contains `<Order>` records, canceled orders are counted separately.

## Privacy

IBKR PnL Lens runs in your browser. The uploaded XML is parsed locally and is not transmitted by the app.

The UI masks account identifiers such as `U12345678` into a redacted format. Still, treat exported brokerage statements as sensitive files and avoid committing them to Git.

## Metrics

- **Net realized P/L**: Sum of realized P/L from closed trades.
- **Profit Factor**: Gross profit divided by gross loss.
- **Win Rate**: Winning closed trades divided by closed trades with non-zero realized P/L.
- **Payoff Ratio**: Average win divided by average loss.
- **Expectancy**: Average realized P/L per closed trade.
- **Auto Expiry**: Option trades with `Ep` notes are included and highlighted.

## Exporting Flex XML From IBKR

In IBKR Client Portal:

1. Open `Performance & Reports`.
2. Go to `Flex Queries`.
3. Create or edit an Activity Flex Query.
4. Choose XML output.
5. Include Trades and Closed Lots.
6. Add Orders / Order History if you need canceled order analysis.
7. Run the query and download the XML file.

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

The production bundle is written to `dist/`.

## Cloudflare Pages

Cloudflare Pages settings:

- Build command: `npm run build`
- Output directory: `dist`
- Node version: `20`

You can either connect the GitHub repo in Cloudflare Pages or deploy manually with Wrangler:

```bash
npx wrangler pages deploy dist --project-name ibkr-pnl-lens
```

## GitHub

```bash
git add .
git commit -m "Update README"
git push
```

## Status

This is an early version. The current focus is accurate IBKR Flex XML parsing, privacy, and a clean offline workflow.
