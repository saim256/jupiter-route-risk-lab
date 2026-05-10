import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { AlertTriangle, Gauge, RefreshCw, Route, Search, ShieldCheck, Sparkles } from 'lucide-react';
import './styles.css';

const SOL_MINT = 'So11111111111111111111111111111111111111112';
const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const DEFAULT_QUERY = 'JUP';

function compactNumber(value) {
  if (value === undefined || value === null || Number.isNaN(Number(value))) return 'n/a';
  return new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 2 }).format(Number(value));
}

function pct(value) {
  if (value === undefined || value === null || Number.isNaN(Number(value))) return 'n/a';
  return `${Number(value).toFixed(2)}%`;
}

async function getJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`${response.status} ${response.statusText}: ${text.slice(0, 140)}`);
  }
  return response.json();
}

async function searchTokens(query) {
  const url = `https://api.jup.ag/tokens/v2/search?query=${encodeURIComponent(query)}`;
  const data = await getJson(url);
  return Array.isArray(data) ? data : data.value || [];
}

async function getPrices(ids) {
  return getJson(`https://api.jup.ag/price/v3?ids=${ids.join(',')}`);
}

async function getQuote(outputMint, decimals) {
  const amount = String(0.1 * 10 ** 9);
  const url = new URL('https://api.jup.ag/swap/v1/quote');
  url.searchParams.set('inputMint', SOL_MINT);
  url.searchParams.set('outputMint', outputMint);
  url.searchParams.set('amount', amount);
  url.searchParams.set('slippageBps', '50');
  const quote = await getJson(url.toString());
  return {
    ...quote,
    readableOut: Number(quote.outAmount || 0) / 10 ** decimals
  };
}

function scoreToken(token, quote) {
  const issues = [];
  let score = 100;

  if (!token.isVerified) {
    score -= 18;
    issues.push('not verified');
  }
  if (token.audit?.mintAuthorityDisabled === false || token.mintAuthority) {
    score -= 18;
    issues.push('mint authority active');
  }
  if (token.audit?.freezeAuthorityDisabled === false || token.freezeAuthority) {
    score -= 16;
    issues.push('freeze authority active');
  }
  if ((token.audit?.topHoldersPercentage || 0) > 25) {
    score -= 12;
    issues.push('top holders concentrated');
  }
  if ((token.liquidity || 0) < 100000) {
    score -= 14;
    issues.push('thin liquidity');
  }
  if ((token.organicScore || 0) < 50) {
    score -= 12;
    issues.push('low organic score');
  }
  if (quote) {
    const priceImpact = Number(quote.priceImpactPct || 0);
    if (priceImpact > 0.01) {
      score -= 10;
      issues.push('route has visible price impact');
    }
    if ((quote.routePlan || []).length === 1) {
      score -= 4;
      issues.push('single venue route');
    }
  }

  return {
    score: Math.max(0, Math.round(score)),
    issues: issues.length ? issues : ['no major static flags in this snapshot']
  };
}

function App() {
  const [query, setQuery] = useState(DEFAULT_QUERY);
  const [tokens, setTokens] = useState([]);
  const [selected, setSelected] = useState(null);
  const [prices, setPrices] = useState({});
  const [quote, setQuote] = useState(null);
  const [status, setStatus] = useState('Search a symbol, name, or mint.');
  const [busy, setBusy] = useState(false);

  async function runSearch(event) {
    event?.preventDefault();
    setBusy(true);
    setStatus('Fetching token metadata from Jupiter Tokens V2...');
    setQuote(null);
    try {
      const result = await searchTokens(query.trim() || DEFAULT_QUERY);
      setTokens(result.slice(0, 12));
      const first = result[0] || null;
      setSelected(first);
      if (first) {
        const ids = [SOL_MINT, USDC_MINT, first.id];
        const priceData = await getPrices(ids);
        setPrices(priceData);
        setStatus(`Loaded ${Math.min(result.length, 12)} candidate tokens. Select one to inspect route risk.`);
      } else {
        setPrices({});
        setStatus('No matching tokens found.');
      }
    } catch (error) {
      setStatus(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function inspectRoute(token = selected) {
    if (!token) return;
    setBusy(true);
    setSelected(token);
    setStatus(`Quoting 0.1 SOL to ${token.symbol} through Jupiter Swap...`);
    try {
      const [priceData, quoteData] = await Promise.all([
        getPrices([SOL_MINT, USDC_MINT, token.id]),
        getQuote(token.id, token.decimals || 6)
      ]);
      setPrices(priceData);
      setQuote(quoteData);
      setStatus('Route quote loaded. No wallet connected and no transaction created.');
    } catch (error) {
      setQuote(null);
      setStatus(error.message);
    } finally {
      setBusy(false);
    }
  }

  const risk = useMemo(() => (selected ? scoreToken(selected, quote) : null), [selected, quote]);
  const selectedPrice = selected ? prices[selected.id] || selected : null;

  return (
    <main>
      <section className="hero">
        <div>
          <p className="eyebrow">Jupiter Developer Platform experiment</p>
          <h1>Route Risk Lab</h1>
          <p className="intro">
            A pre-trade signal tool for agents and humans. It combines Jupiter Tokens V2,
            Price V3, and Swap quote data to score token hygiene and route fragility before a wallet connects.
          </p>
        </div>
        <div className="metric-panel">
          <Gauge />
          <span>Risk Score</span>
          <strong>{risk ? risk.score : '--'}</strong>
        </div>
      </section>

      <section className="toolbar">
        <form onSubmit={runSearch} className="search">
          <Search size={18} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search JUP, WIF, USDC, or a mint" />
          <button type="submit" disabled={busy}>{busy ? <RefreshCw className="spin" size={16} /> : 'Search'}</button>
        </form>
        <button className="secondary" onClick={() => inspectRoute()} disabled={!selected || busy}>
          <Route size={16} /> Inspect Route
        </button>
      </section>

      <p className="status">{status}</p>

      <section className="grid">
        <aside className="results">
          <h2>Token Candidates</h2>
          {tokens.length === 0 && <button onClick={runSearch} className="wide">Load Jupiter Tokens</button>}
          {tokens.map((token) => (
            <button
              key={token.id}
              className={`token-row ${selected?.id === token.id ? 'active' : ''}`}
              onClick={() => inspectRoute(token)}
            >
              <img src={token.icon || '/vite.svg'} alt="" />
              <span>
                <strong>{token.symbol}</strong>
                <small>{token.name}</small>
              </span>
              <em>{token.organicScoreLabel || 'unknown'}</em>
            </button>
          ))}
        </aside>

        <section className="analysis">
          <div className="card selected">
            <div className="card-title">
              <ShieldCheck />
              <h2>{selected ? `${selected.name} (${selected.symbol})` : 'Select a Token'}</h2>
            </div>
            {selected && (
              <div className="stats">
                <span>Price <strong>${Number(selectedPrice?.usdPrice || selected.usdPrice || 0).toFixed(6)}</strong></span>
                <span>Liquidity <strong>${compactNumber(selected.liquidity)}</strong></span>
                <span>Market Cap <strong>${compactNumber(selected.mcap)}</strong></span>
                <span>Holders <strong>{compactNumber(selected.holderCount)}</strong></span>
                <span>Organic <strong>{Math.round(selected.organicScore || 0)}</strong></span>
                <span>24h Change <strong>{pct(selected.stats24h?.priceChange ?? selectedPrice?.priceChange24h)}</strong></span>
              </div>
            )}
          </div>

          <div className="card risk">
            <div className="card-title">
              <AlertTriangle />
              <h2>Static + Route Risk</h2>
            </div>
            {risk ? (
              <>
                <div className="scorebar"><span style={{ width: `${risk.score}%` }} /></div>
                <ul>{risk.issues.map((item) => <li key={item}>{item}</li>)}</ul>
              </>
            ) : (
              <p>Select a token to calculate a score.</p>
            )}
          </div>

          <div className="card route-card">
            <div className="card-title">
              <Route />
              <h2>0.1 SOL Route Quote</h2>
            </div>
            {quote ? (
              <>
                <div className="stats">
                  <span>Output <strong>{compactNumber(quote.readableOut)} {selected?.symbol}</strong></span>
                  <span>Impact <strong>{quote.priceImpactPct}</strong></span>
                  <span>Time <strong>{Number(quote.timeTaken || 0).toFixed(4)}s</strong></span>
                  <span>Slot <strong>{quote.contextSlot}</strong></span>
                </div>
                <div className="venues">
                  {(quote.routePlan || []).map((step, index) => (
                    <div key={`${step.swapInfo?.ammKey}-${index}`}>
                      <span>{step.swapInfo?.label || 'Unknown venue'}</span>
                      <strong>{step.percent || step.bps / 100}%</strong>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p>No quote loaded yet. Quotes are read-only and do not create transactions.</p>
            )}
          </div>

          <div className="card idea-card">
            <div className="card-title">
              <Sparkles />
              <h2>Why This Is Useful</h2>
            </div>
            <p>
              Most wallet flows start with a swap button. This starts with a sanity check:
              token authority state, holder concentration, live liquidity, Jupiter organic signal,
              and whether a small quote depends on one venue.
            </p>
          </div>
        </section>
      </section>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
