import { memo, useEffect, useState } from "react";
import { useWebSocketStore } from "../../stores/useWebSocketStore";
import type { Widget, Trade } from "../../types";
import "./TradeFeedWidget.css";

interface TradeFeedWidgetProps {
  widget: Widget;
  onRemove: () => void;
}

export const TradeFeedWidget = memo(function TradeFeedWidget({
  widget,
  onRemove,
}: TradeFeedWidgetProps) {
  const [copied, setCopied] = useState(false);
  const subscribe = useWebSocketStore((state) => state.subscribe);
  const unsubscribe = useWebSocketStore((state) => state.unsubscribe);
  const tradeData = useWebSocketStore((state) =>
    state.tradeData.get(widget.contractAddress)
  );

  useEffect(() => {
    // Subscribe to trade feed for this contract
    subscribe(widget.contractAddress, widget.id, "trade-feed");

    return () => {
      unsubscribe(widget.contractAddress, widget.id);
    };
  }, [widget.contractAddress, widget.id, subscribe, unsubscribe]);

  const formatPrice = (price: number) => {
    if (price < 0.01) return price.toFixed(6);
    if (price < 1) return price.toFixed(4);
    return price.toFixed(2);
  };

  const formatAmount = (amount: number) => {
    if (amount < 0.01) return amount.toFixed(6);
    if (amount < 1000) return amount.toFixed(2);
    if (amount < 1000000) return `${(amount / 1000).toFixed(2)}K`;
    return `${(amount / 1000000).toFixed(2)}M`;
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(widget.contractAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  // Keep only last 20 trades
  const trades = tradeData?.trades.slice(0, 20) || [];

  return (
    <div className="widget trade-feed-widget">
      <div className="widget-header">
        <h3>Trade Feed</h3>
        <button className="remove-btn" onClick={onRemove} title="Remove widget">
          ×
        </button>
      </div>

      <div className="widget-content">
        <div
          className="contract-address"
          onClick={copyAddress}
          title="Click to copy address"
        >
          {widget.contractAddress}
          {copied && <span className="copied-badge">✓ Copied!</span>}
        </div>

        {trades.length > 0 ? (
          <div className="trades-list">
            <div className="trades-header">
              <span className="col-time">Time</span>
              <span className="col-type">Type</span>
              <span className="col-price">Price</span>
              <span className="col-amount">Amount</span>
            </div>
            {trades.map((trade: Trade, index: number) => (
              <div
                key={`${trade.id}-${index}`}
                className={`trade-item ${trade.type}`}
              >
                <span className="col-time">{formatTime(trade.timestamp)}</span>
                <span className={`col-type badge ${trade.type}`}>
                  {trade.type.toUpperCase()}
                </span>
                <span className="col-price">${formatPrice(trade.price)}</span>
                <span className="col-amount">{formatAmount(trade.amount)}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="loading">Loading trade feed...</div>
        )}
      </div>
    </div>
  );
});
