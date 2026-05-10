# Jupiter Developer Experience Report

## Project

Jupiter Route Risk Lab is a walletless route and token sanity-check tool. It uses Jupiter Tokens V2, Price V3, and Swap quote data to answer a narrow question before any transaction exists: "Does this token and route look fragile?"

## APIs Used

- `GET https://api.jup.ag/tokens/v2/search?query=...`
- `GET https://api.jup.ag/price/v3?ids=...`
- `GET https://api.jup.ag/swap/v1/quote?...`

The app uses keyless access for agent/test usage and performs only read-only requests.

## Onboarding Timing

Time from opening the docs to first successful API call was about 10 minutes. Tokens V2 and Price V3 were the fastest to validate because the endpoint shape and response examples are direct. The Swap quote endpoint also worked quickly once the raw amount and mint addresses were set correctly.

## What Worked Well

- The Tokens V2 response is unusually useful for pre-trade UX. It includes organic score, verification tags, holder counts, liquidity, authority flags, and short-interval stats in one payload.
- Price V3 is simple enough that it can be used directly from a static app.
- Swap quote output exposes venue labels and timing, which makes route explainability easy.
- Keyless access worked for test usage, which is important for agents that need to prototype before a human creates a Developer Platform account.

## Friction and Missing Pieces

1. The bounty asks builders to use the new Developer Platform and mentions Swap V2, but the quickest public quote documentation still surfaces `/swap/v1/quote` prominently. The V2 `order` docs are more API-reference shaped and less tutorial shaped.
2. The docs say every API uses a single API key, but the portal payment page says keyless access is valid for AI agent or test use cases. That is useful, but the individual API pages mark `x-api-key` as required. This creates uncertainty for hackathon submissions: should a prototype be scored lower if it uses documented keyless test access?
3. Tokens V2 returns a very rich object, but the schema is marked subject to change. For production UI, stable field names for `audit`, `organicScore`, `stats24h`, and `liquidity` would make integrations safer.
4. Swap quote route plans expose venue labels, but there is no obvious normalized route risk summary. A compact "route quality" field could help wallets and agents avoid inventing inconsistent heuristics.
5. Error examples are sparse. A "common mistakes" table for wrong mint, raw amount decimals, missing amount, and rate limits would save agent loops.

## AI Stack Feedback

The docs index and clean endpoint examples are agent-friendly. The most helpful addition would be a downloadable "Jupiter read-only app skill" that contains:

- canonical mint constants for SOL and USDC
- raw amount conversion examples
- when keyless access is acceptable
- v1 quote versus v2 order decision guidance
- CORS expectations for browser apps
- a minimal risk/disclosure checklist for walletless prototypes

## How I Would Rebuild The Developer Landing Flow

I would make the first screen split by builder intent:

- "Read-only analytics app"
- "Wallet swap app"
- "Trading agent"
- "Lending/yield app"
- "Limit order/DCA app"

Each intent should generate a working starter snippet with the right endpoint family and a clear keyless/API-key note. For this project, "Read-only analytics app" would have pointed directly to Tokens V2 plus Price V3 plus quote inspection and avoided ambiguity around execution endpoints.

## What I Wish Existed

- A `GET /risk/token` or optional `includeRisk=true` on Tokens V2 that normalizes authority flags, holder concentration, organic score, and liquidity into documented bands.
- A quote endpoint option to return alternative routes even when best route is clearly dominant, so builders can show route concentration and fallback options.
- A no-wallet "simulation explanation" endpoint for users who only want to preview route risks without creating a transaction.
- A small public dataset of tricky tokens and expected warnings for testing token safety UIs.

## Verification

Local checks:

```bash
npm run snapshot
npm run build
```

The snapshot command fetches live Jupiter Tokens V2, Price V3, and Swap quote data and prints a compact JSON proof.
