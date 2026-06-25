# Repository Development Rules

## Privacy First

This project handles brokerage statement data. Treat every real IBKR Flex XML,
export, screenshot, log, and account identifier as sensitive.

Never commit:

- Real account IDs, names, addresses, emails, or phone numbers.
- Real Flex XML exports or broker statements.
- API keys, tokens, secrets, passwords, cookies, or session data.
- Screenshots that expose account IDs, names, balances, positions, or order IDs.
- Local debug files, temporary exports, or generated private reports.

## Test Data

Use only synthetic data in tests and fixtures.

- Account IDs must use obvious fake values such as `DEMO-ACCOUNT`.
- Tickers, prices, dates, and P/L values may be realistic, but must not come from
  a private statement unless fully anonymized and materially altered.
- Keep fixtures small and focused on parser or UI behavior.

## UI And Logging

- Keep account identifiers masked in the UI.
- Do not add console logs that print raw XML rows, account fields, names, or
  full trade payloads.
- Error messages should explain the failure without echoing sensitive source
  data.

## Before Commit

Run the normal verification commands:

```text
npm run test
npm run build
```

Before committing, search for sensitive data patterns and inspect any matches.
Matches in documentation about security rules or explicit `DEMO-*` fixtures are
acceptable; real identifiers are not.

```text
rg -n --hidden --glob '!node_modules' --glob '!dist' --glob '!.git' --glob '!.test-build' "(api[_-]?key|secret|token|password|passwd|accountId=|accountId\"|account id|U[0-9]{5,}|DU[0-9]{5,}|[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}|sk-[A-Za-z0-9_-]{20,}|AKIA[0-9A-Z]{16})" .
```

Use lower-case Conventional Commits.
