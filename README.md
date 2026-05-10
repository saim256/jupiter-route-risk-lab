# Jupiter Route Risk Lab

Jupiter Route Risk Lab is a read-only pre-trade signal dashboard for the Frontier "Not Your Regular Bounty" track.

It combines:

- Jupiter Tokens V2 search and token metadata
- Jupiter Price V3 live prices
- Jupiter Swap quote route plans

The app scores a token before a wallet connects by checking metadata, authority flags, organic score, liquidity, holder concentration, price impact, and route concentration. It does not create, sign, or submit transactions.

## Run

```bash
npm install
npm run dev
```

## Verify API Calls

```bash
npm run snapshot
```

## Build

```bash
npm run build
```

## Submission Notes

The DX report is in [DX-REPORT.md](DX-REPORT.md).
