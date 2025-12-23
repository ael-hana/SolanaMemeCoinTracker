import { useState } from "react";
import type { WidgetType } from "../../types";
import "./AddWidgetModal.css";

interface AddWidgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (type: WidgetType, contractAddress: string) => void;
}

const DEMO_TOKENS = [
  {
    address: "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm",
    label: "dogwifhat",
  },
  {
    address: "So11111111111111111111111111111111111111112",
    label: "SOL",
  },
  {
    address: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    label: "USDC",
  },
];

export function AddWidgetModal({
  isOpen,
  onClose,
  onAdd,
}: AddWidgetModalProps) {
  const [selectedType, setSelectedType] = useState<WidgetType>("live-price");
  const [contractAddress, setContractAddress] = useState("");

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contractAddress.trim()) return;

    onAdd(selectedType, contractAddress.trim());
    setContractAddress("");
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Add Widget</h2>
          <button className="close-btn" onClick={onClose}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label>Widget Type</label>
            <div className="widget-types">
              <button
                type="button"
                className={`widget-type-btn ${
                  selectedType === "live-price" ? "active" : ""
                }`}
                onClick={() => setSelectedType("live-price")}
              >
                <div className="widget-type-icon">📊</div>
                <div className="widget-type-name">Live Price</div>
                <div className="widget-type-desc">
                  Price in USD, SOL & 24h change
                </div>
              </button>

              <button
                type="button"
                className={`widget-type-btn ${
                  selectedType === "trade-feed" ? "active" : ""
                }`}
                onClick={() => setSelectedType("trade-feed")}
              >
                <div className="widget-type-icon">📈</div>
                <div className="widget-type-name">Trade Feed</div>
                <div className="widget-type-desc">Latest 20 trades</div>
              </button>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="contractAddress">Contract Address</label>
            <input
              id="contractAddress"
              type="text"
              placeholder="Enter Solana contract address..."
              value={contractAddress}
              onChange={(e) => setContractAddress(e.target.value)}
              autoFocus
            />
            <div className="demo-tokens">
              <small>Quick select:</small>
              <div className="demo-token-buttons">
                {DEMO_TOKENS.map((token) => (
                  <button
                    key={token.address}
                    type="button"
                    className="demo-token-btn"
                    onClick={() => setContractAddress(token.address)}
                  >
                    {token.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={!contractAddress.trim()}
            >
              Add Widget
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
