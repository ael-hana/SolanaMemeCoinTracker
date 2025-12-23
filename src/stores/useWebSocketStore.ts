import { create } from "zustand";
import type { PriceData, TradeData, WSMessage } from "../types";

interface WebSocketState {
  sharedWorker: SharedWorker | null;
  port: MessagePort | null;
  isConnected: boolean;
  priceData: Map<string, PriceData>; // contractAddress -> PriceData
  tradeData: Map<string, TradeData>; // contractAddress -> TradeData
  error: string | null;
}

interface WebSocketActions {
  initWorker: () => void;
  subscribe: (
    contractAddress: string,
    widgetId: string,
    widgetType: "live-price" | "trade-feed"
  ) => void;
  unsubscribe: (contractAddress: string, widgetId: string) => void;
  disconnect: () => void;
}

type WebSocketStore = WebSocketState & WebSocketActions;

export const useWebSocketStore = create<WebSocketStore>((set, get) => ({
  // State
  sharedWorker: null,
  port: null,
  isConnected: false,
  priceData: new Map(),
  tradeData: new Map(),
  error: null,

  // Actions
  initWorker: () => {
    const existingWorker = get().sharedWorker;
    if (existingWorker) return; // Already initialized

    console.log(
      "[Store] 🚀 Initializing SharedWorker for multi-tab support..."
    );

    // Create SharedWorker from separate file
    const sharedWorker = new SharedWorker(
      new URL("../workers/websocket.shared-worker.ts", import.meta.url),
      {
        type: "module",
        name: "solana-websocket-shared",
      }
    );

    const port = sharedWorker.port;

    // Handle messages from SharedWorker
    port.onmessage = (event: MessageEvent<WSMessage>) => {
      const { type, payload } = event.data;

      switch (type) {
        case "connected":
          set({ isConnected: true, error: null });
          break;

        case "disconnected":
          set({ isConnected: false });
          break;

        case "error":
          set({ error: (payload as { message: string }).message });
          break;

        case "data": {
          const data = payload as {
            widgetId: string;
            data: PriceData | TradeData;
          };

          // Check if it's PriceData or TradeData
          console.log("⛔️data received in store:", data.data);

          if ("price" in data.data) {
            console.log("✅data received in store:", data.data);

            const priceData = data.data as PriceData;
            set((state) => {
              const newPriceData = new Map(state.priceData);
              newPriceData.set(priceData.contractAddress, priceData);
              return { priceData: newPriceData };
            });
            console.log(
              "[Store] 📈 Price data updated for",
              priceData.contractAddress
            );
          } else if ("trades" in data.data) {
            const tradeData = data.data as TradeData;
            set((state) => {
              const newTradeData = new Map(state.tradeData);
              newTradeData.set(tradeData.contractAddress, tradeData);
              return { tradeData: newTradeData };
            });
          }
          break;
        }

        default:
          console.warn("[Store] Unknown message type:", type);
      }
    };

    // Start the port
    port.start();
    console.log("[Store] ✅ SharedWorker port started");

    set({ sharedWorker, port });
  },

  subscribe: (contractAddress, widgetId, widgetType) => {
    const { port } = get();
    if (!port) {
      console.error("[Store] SharedWorker port not initialized");
      return;
    }

    port.postMessage({
      type: "subscribe",
      payload: { contractAddress, widgetId, widgetType },
    });
  },

  unsubscribe: (contractAddress, widgetId) => {
    const { port } = get();
    if (!port) return;

    port.postMessage({
      type: "unsubscribe",
      payload: { contractAddress, widgetId },
    });
  },

  disconnect: () => {
    const { port } = get();
    if (port) {
      port.close();
      console.log("[Store] 🔌 SharedWorker port closed");
      set({ sharedWorker: null, port: null, isConnected: false });
    }
  },
}));
