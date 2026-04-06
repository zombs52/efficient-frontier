import { useState } from "react";
import axios from "axios";
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ZAxis, Cell } from "recharts";

interface Portfolio {
  return: number;
  volatility: number;
  sharpe: number;
  weights: Record<string, number>;
}

function sharpeColor(sharpe: number, min: number, max: number) {
  const t = (sharpe - min) / (max - min);
  const r = Math.round(255 * (1 - t));
  const g = Math.round(200 * t);
  const b = Math.round(255 * (1 - t));
  return `rgb(${r},${g},${b})`;
}

export default function App() {
  const [tickers, setTickers] = useState("AAPL,MSFT,GOOGL,AMZN");
  const [startDate, setStartDate] = useState("2020-01-01");
  const [endDate, setEndDate] = useState("2024-01-01");
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<any>(null);

  const run = async () => {
    setLoading(true);
    setError("");
    setPortfolios([]);
    setSelected(null);
    try {
      const res = await axios.post("http://localhost:8000/efficient-frontier", {
        tickers: tickers.split(",").map(t => t.trim().toUpperCase()),
        start_date: startDate,
        end_date: endDate,
        num_portfolios: 3000,
      });
      setPortfolios(res.data.portfolios);
    } catch (e) {
      setError("Something went wrong. Check your tickers and dates.");
    }
    setLoading(false);
  };

  const best = portfolios.length ? portfolios.reduce((a, b) => a.sharpe > b.sharpe ? a : b) : null;
  const minSharpe = portfolios.length ? Math.min(...portfolios.map(p => p.sharpe)) : 0;
  const maxSharpe = portfolios.length ? Math.max(...portfolios.map(p => p.sharpe)) : 1;

  const chartData = portfolios
    .map(p => ({
      x: +(p.volatility * 100).toFixed(2),
      y: +(p.return * 100).toFixed(2),
      sharpe: p.sharpe,
      weights: p.weights,
    }))
    .sort((a, b) => a.x - b.x);

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: 32, fontFamily: "sans-serif" }}>
      <h1>Efficient Frontier</h1>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
        <div>
          <label>Tickers (comma separated)<br />
            <input value={tickers} onChange={e => setTickers(e.target.value)} style={{ width: 300, padding: 6 }} />
          </label>
        </div>
        <div>
          <label>Start date<br />
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ padding: 6 }} />
          </label>
        </div>
        <div>
          <label>End date<br />
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={{ padding: 6 }} />
          </label>
        </div>
      </div>

      <button onClick={run} disabled={loading} style={{ padding: "8px 24px", fontSize: 16, cursor: "pointer" }}>
        {loading ? "Calculating..." : "Run"}
      </button>

      {error && <p style={{ color: "red" }}>{error}</p>}

      {portfolios.length > 0 && (
        <>
          <p style={{ marginTop: 16 }}>{portfolios.length} portfolios simulated. <span style={{ color: "green" }}>Green = high Sharpe</span>, <span style={{ color: "purple" }}>purple = low Sharpe</span>. Click a dot to see weights.</p>
          <ResponsiveContainer width="100%" height={400}>
            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
              <CartesianGrid />
              <XAxis dataKey="x" name="Volatility" type="number" domain={["auto", "auto"]} tickFormatter={v => `${v}%`} label={{ value: "Volatility (%)", position: "insideBottom", offset: -10 }} />
              <YAxis dataKey="y" name="Return" label={{ value: "Return (%)", angle: -90, position: "insideLeft" }} />
              <ZAxis range={[20, 20]} />
              <Tooltip cursor={{ strokeDasharray: "3 3" }} formatter={(v, n) => [`${v}%`, n]} />
              <Scatter data={chartData} onClick={(d) => setSelected(d)}>
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={sharpeColor(entry.sharpe, minSharpe, maxSharpe)} fillOpacity={0.6} />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>

          {best && (
            <div style={{ marginTop: 16, padding: 16, background: "#f0f0f0", borderRadius: 8 }}>
              <strong>Best Sharpe Ratio Portfolio ({best.sharpe.toFixed(2)})</strong>
              <p>Return: {(best.return * 100).toFixed(2)}% | Volatility: {(best.volatility * 100).toFixed(2)}%</p>
              <p>Weights: {Object.entries(best.weights).map(([k, v]) => `${k}: ${(v * 100).toFixed(1)}%`).join(" | ")}</p>
            </div>
          )}

          {selected && (
            <div style={{ marginTop: 12, padding: 16, background: "#e8f4ff", borderRadius: 8 }}>
              <strong>Selected Portfolio</strong>
              <p>Return: {selected.y}% | Volatility: {selected.x}% | Sharpe: {selected.sharpe?.toFixed(2)}</p>
              <p>Weights: {Object.entries(selected.weights || {}).map(([k, v]) => `${k}: ${(+(v as number) * 100).toFixed(1)}%`).join(" | ")}</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}