import { useState } from "react";
import axios from "axios";
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ZAxis, Cell, PieChart, Pie, Legend,
} from "recharts";

interface Portfolio {
  return: number;
  volatility: number;
  sharpe: number;
  weights: Record<string, number>;
}

interface Asset {
  ticker: string;
  return: number;
  volatility: number;
}

function sharpeColor(sharpe: number, min: number, max: number) {
  const t = (sharpe - min) / (max - min);
  const r = Math.round(255 * (1 - t));
  const g = Math.round(200 * t);
  const b = Math.round(255 * (1 - t));
  return `rgb(${r},${g},${b})`;
}

const PIE_COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#3b82f6", "#ec4899", "#14b8a6", "#f97316"];

const AssetDot = (props: any) => {
  const { cx, cy, payload } = props;
  return (
    <g>
      <circle cx={cx} cy={cy} r={6} fill="#ff7300" stroke="white" strokeWidth={1.5} />
      <text x={cx} y={cy - 10} textAnchor="middle" fill="#333" fontSize={11} fontWeight="bold">
        {payload.ticker}
      </text>
    </g>
  );
};

function WeightsPie({ weights }: { weights: Record<string, number> }) {
  const data = Object.entries(weights).map(([name, value]) => ({
    name,
    value: +(value * 100).toFixed(1),
  }));
  return (
    <PieChart width={320} height={220}>
      <Pie
        data={data}
        dataKey="value"
        nameKey="name"
        cx="50%"
        cy="45%"
        outerRadius={65}
      >
        {data.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
      </Pie>
      <Tooltip formatter={(v) => `${v}%`} />
      <Legend />
    </PieChart>
  );
}

export default function App() {
  const [tickers, setTickers] = useState("AAPL,MSFT,GOOGL,AMZN");
  const [startDate, setStartDate] = useState("2020-01-01");
  const [endDate, setEndDate] = useState("2024-01-01");
  const [riskFreeRate, setRiskFreeRate] = useState("2");
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<any>(null);

  const run = async () => {
    setLoading(true);
    setError("");
    setPortfolios([]);
    setAssets([]);
    setSelected(null);
    try {
      const res = await axios.post("https://efficient-frontier-jbcn.onrender.com/efficient-frontier", {
        tickers: tickers.split(",").map(t => t.trim().toUpperCase()),
        start_date: startDate,
        end_date: endDate,
        num_portfolios: 3000,
        risk_free_rate: parseFloat(riskFreeRate) / 100 || 0,
      }, { timeout: 90000 });
      setPortfolios(res.data.portfolios);
      setAssets(res.data.assets);
    } catch (e) {
      setError("Something went wrong. If this is the first request in a while, the server may be waking up — wait 30 seconds and try again.");
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

  const assetChartData = assets.map(a => ({
    x: +(a.volatility * 100).toFixed(2),
    y: +(a.return * 100).toFixed(2),
    ticker: a.ticker,
  }));

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
        <div>
          <label>Risk-free rate (%)<br />
            <input
              type="number"
              value={riskFreeRate}
              onChange={e => setRiskFreeRate(e.target.value)}
              step="0.1"
              min="0"
              max="20"
              style={{ width: 80, padding: 6 }}
            />
          </label>
        </div>
      </div>

      <button onClick={run} disabled={loading} style={{ padding: "8px 24px", fontSize: 16, cursor: "pointer" }}>
        {loading ? "Calculating..." : "Run"}
      </button>

      {error && <p style={{ color: "red" }}>{error}</p>}

      {portfolios.length > 0 && (
        <>
          <p style={{ marginTop: 16 }}>
            {portfolios.length} portfolios simulated.{" "}
            <span style={{ color: "green" }}>Green = high Sharpe</span>,{" "}
            <span style={{ color: "purple" }}>purple = low Sharpe</span>.{" "}
            <span style={{ color: "#ff7300" }}>Orange dots = individual assets</span>.{" "}
            Click a dot to see weights.
          </p>
          <ResponsiveContainer width="100%" height={420}>
            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
              <CartesianGrid />
              <XAxis
                dataKey="x"
                name="Volatility"
                type="number"
                domain={["auto", "auto"]}
                tickFormatter={v => `${v}%`}
                label={{ value: "Volatility (%)", position: "insideBottom", offset: -10 }}
              />
              <YAxis
                dataKey="y"
                name="Return"
                label={{ value: "Return (%)", angle: -90, position: "insideLeft" }}
              />
              <ZAxis range={[20, 20]} />
              <Tooltip cursor={{ strokeDasharray: "3 3" }} formatter={(v, n) => [`${v}%`, n]} />
              <Scatter data={chartData} onClick={(d) => setSelected(d)}>
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={sharpeColor(entry.sharpe, minSharpe, maxSharpe)} fillOpacity={0.6} />
                ))}
              </Scatter>
              <Scatter data={assetChartData} shape={<AssetDot />} />
            </ScatterChart>
          </ResponsiveContainer>

          {best && (
            <div style={{ marginTop: 16, padding: 16, background: "#f0f0f0", borderRadius: 8 }}>
              <strong>Best Sharpe Ratio Portfolio ({best.sharpe.toFixed(2)})</strong>
              <p>Return: {(best.return * 100).toFixed(2)}% | Volatility: {(best.volatility * 100).toFixed(2)}%</p>
              <p>Weights: {Object.entries(best.weights).map(([k, v]) => `${k}: ${(v * 100).toFixed(1)}%`).join(" | ")}</p>
              <WeightsPie weights={best.weights} />
            </div>
          )}

          {selected && (
            <div style={{ marginTop: 12, padding: 16, background: "#e8f4ff", borderRadius: 8 }}>
              <strong>Selected Portfolio</strong>
              <p>Return: {selected.y}% | Volatility: {selected.x}% | Sharpe: {selected.sharpe?.toFixed(2)}</p>
              <p>Weights: {Object.entries(selected.weights || {}).map(([k, v]) => `${k}: ${(+(v as number) * 100).toFixed(1)}%`).join(" | ")}</p>
              <WeightsPie weights={selected.weights} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
