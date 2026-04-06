from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import numpy as np
import yfinance as yf
from scipy.optimize import minimize

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class PortfolioRequest(BaseModel):
    tickers: list[str]
    start_date: str
    end_date: str
    num_portfolios: int = 5000
    risk_free_rate: float = 0.0

@app.post("/efficient-frontier")
def efficient_frontier(req: PortfolioRequest):
    # Download price data
    data = yf.download(req.tickers, start=req.start_date, end=req.end_date, auto_adjust=True)["Close"]
    returns = data.pct_change().dropna()

    mean_returns = returns.mean() * 252
    cov_matrix = returns.cov() * 252
    num_assets = len(req.tickers)

    # Individual asset metrics
    assets = []
    for ticker in mean_returns.index:
        ret = float(mean_returns[ticker])
        vol = float(np.sqrt(cov_matrix.loc[ticker, ticker]))
        assets.append({
            "ticker": ticker,
            "return": round(ret, 4),
            "volatility": round(vol, 4),
        })

    results = []
    for _ in range(req.num_portfolios):
        weights = np.random.dirichlet(np.ones(num_assets))
        ret = float(np.dot(weights, mean_returns))
        vol = float(np.sqrt(weights @ cov_matrix.values @ weights))
        sharpe = (ret - req.risk_free_rate) / vol if vol > 0 else 0
        results.append({
            "return": round(ret, 4),
            "volatility": round(vol, 4),
            "sharpe": round(sharpe, 4),
            "weights": {ticker: round(float(w), 4) for ticker, w in zip(req.tickers, weights)}
        })

    return {"portfolios": results, "assets": assets}

@app.get("/")
def root():
    return {"status": "ok"}
