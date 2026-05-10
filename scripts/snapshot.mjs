const SOL_MINT = 'So11111111111111111111111111111111111111112';
const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const JUP_MINT = 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN';

async function getJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}: ${await response.text()}`);
  }
  return response.json();
}

const [tokens, prices, quote] = await Promise.all([
  getJson('https://api.jup.ag/tokens/v2/search?query=JUP'),
  getJson(`https://api.jup.ag/price/v3?ids=${SOL_MINT},${USDC_MINT},${JUP_MINT}`),
  getJson(`https://api.jup.ag/swap/v1/quote?inputMint=${SOL_MINT}&outputMint=${USDC_MINT}&amount=100000000&slippageBps=50`)
]);

const summary = {
  generatedAt: new Date().toISOString(),
  tokenCount: Array.isArray(tokens) ? tokens.length : tokens.value?.length,
  firstToken: (Array.isArray(tokens) ? tokens : tokens.value)[0],
  prices,
  quote: {
    inputMint: quote.inputMint,
    outputMint: quote.outputMint,
    outAmount: quote.outAmount,
    priceImpactPct: quote.priceImpactPct,
    venueLabels: quote.routePlan?.map((step) => step.swapInfo?.label),
    timeTaken: quote.timeTaken
  }
};

console.log(JSON.stringify(summary, null, 2));
