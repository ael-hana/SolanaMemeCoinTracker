import { memo, useEffect, useState } from "react";
import { useWebSocketStore } from "../../stores/useWebSocketStore";
import type { Widget } from "../../types";
import "./LivePriceWidget.css";

interface LivePriceWidgetProps {
  widget: Widget;
  onRemove: () => void;
}

export const LivePriceWidget = memo(function LivePriceWidget({
  widget,
  onRemove,
}: LivePriceWidgetProps) {
  const [copied, setCopied] = useState(false);
  const [, forceUpdate] = useState(0);
  const subscribe = useWebSocketStore((state) => state.subscribe);
  const unsubscribe = useWebSocketStore((state) => state.unsubscribe);
  const priceData = useWebSocketStore((state) =>
    state.priceData.get(widget.contractAddress)
  );

  // Force re-render when priceData changes (including timestamp)
  useEffect(() => {
    if (priceData) {
      forceUpdate(priceData.timestamp);
    }
  }, [priceData]);

  useEffect(() => {
    // Subscribe to price updates for this contract
    subscribe(widget.contractAddress, widget.id, "live-price");

    return () => {
      // Unsubscribe when widget unmounts
      unsubscribe(widget.contractAddress, widget.id);
    };
  }, [widget.contractAddress, widget.id, subscribe, unsubscribe]);

  const formatPrice = (price: number) => {
    if (price < 0.01) return price.toFixed(6);
    if (price < 1) return price.toFixed(4);
    return price.toFixed(2);
  };

  const formatPercentage = (percentage: number) => {
    const sign = percentage >= 0 ? "+" : "";
    return `${sign}${percentage.toFixed(2)}%`;
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

  return (
    <div className="widget live-price-widget">
      <div className="widget-header">
        <h3>Live Price</h3>
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

        {priceData ? (
          <>
            <div className="price-main">
              <div className="price-usd">
                <span className="label">USD</span>
                <span className="value">${formatPrice(priceData.price)}</span>
              </div>
              <div className="price-sol">
                <span className="label">SOL</span>
                <span className="value">
                  {formatPrice(priceData.priceInSOL)}
                </span>
              </div>
            </div>

            <div
              className={`price-change ${
                priceData.priceChange24h >= 0 ? "positive" : "negative"
              }`}
            >
              <span className="label">24h Change</span>
              <span className="value">
                {formatPercentage(priceData.priceChange24h)}
              </span>
            </div>

            <div className="last-update">
              Last update: {new Date(priceData.timestamp).toLocaleTimeString()}
            </div>
          </>
        ) : (
          <div className="loading">Loading price data...</div>
        )}
      </div>
    </div>
  );
});
