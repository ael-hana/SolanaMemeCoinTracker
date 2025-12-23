/**
 * SharedWorker - Single WebSocket connection shared across ALL browser tabs
 * Massive performance gain: 1 connection for unlimited tabs instead of N connections
 */

import type {
  WSSubscribeMessage,
  WSUnsubscribeMessage,
  WSMessage,
} from "../types";

const SOL_ADDRESS = "So11111111111111111111111111111111111111112";

interface Subscription {
  contractAddress: string;
  widgetId: string;
  widgetType: "live-price" | "trade-feed";
}

interface ConnectedPort {
  port: MessagePort;
  subscriptions: Map<string, Subscription[]>; // contractAddress -> subscribers
}

class SharedWebSocketManager {
  private ws: WebSocket | null = null;
  private connectedPorts = new Set<ConnectedPort>();
  private allSubscriptions = new Map<string, Subscription[]>(); // Global subscriptions
  private tokenSubscriberCount = new Map<string, number>(); // Track how many tabs follow each token
  private solPriceUSD: number = 0; // Cache SOL price for calculations
  private hasLivePriceWidgets: boolean = false; // Track if any live-price widgets exist
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 5;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private readonly apiKey = import.meta.env.VITE_MOBULA_API_KEY || "";
  private pingInterval: ReturnType<typeof setInterval> | null = null;
  private tradeCache = new Map<string, any[]>();
  private intentionalClose = false; // Flag to prevent reconnection on voluntary close

  constructor() {
    console.log(
      "[SharedWorker] 🚀 Initialized - Will be shared across all tabs!"
    );
  }

  addPort(port: MessagePort) {
    const connectedPort: ConnectedPort = {
      port,
      subscriptions: new Map(),
    };

    this.connectedPorts.add(connectedPort);
    console.log(
      `[SharedWorker] 📱 New tab connected! Total tabs: ${this.connectedPorts.size}`
    );

    // Send connected status to new tab
    this.postMessageToPort(port, { type: "connected" });

    // Setup message listener for this port
    port.onmessage = (event: MessageEvent<WSMessage>) => {
      this.handlePortMessage(event.data, connectedPort);
    };

    // If this is the first tab, connect to WebSocket
    if (this.connectedPorts.size === 1) {
      this.connect();
    }

    // Send existing data to new tab for subscribed tokens
    this.syncExistingDataToPort(connectedPort);
  }

  removePort(port: MessagePort) {
    const connectedPort = Array.from(this.connectedPorts).find(
      (cp) => cp.port === port
    );
    if (connectedPort) {
      this.connectedPorts.delete(connectedPort);
      console.log(
        `[SharedWorker] 📴 Tab disconnected. Remaining tabs: ${this.connectedPorts.size}`
      );

      // Remove all subscriptions from this port
      for (const [contractAddress] of connectedPort.subscriptions) {
        this.unsubscribeGlobal(contractAddress, connectedPort);
      }

      // If no more tabs, disconnect WebSocket
      if (this.connectedPorts.size === 0) {
        console.log("[SharedWorker] 🔌 No more tabs, closing WebSocket...");
        this.disconnect();
      }
    }
  }

  private handlePortMessage(message: WSMessage, connectedPort: ConnectedPort) {
    const { type, payload } = message;

    switch (type) {
      case "subscribe": {
        const { contractAddress, widgetId, widgetType } =
          payload as WSSubscribeMessage["payload"];
        this.subscribeGlobal(
          contractAddress,
          widgetId,
          widgetType,
          connectedPort
        );
        break;
      }
      case "unsubscribe": {
        const { contractAddress } = payload as WSUnsubscribeMessage["payload"];
        this.unsubscribeGlobal(contractAddress, connectedPort);
        break;
      }
    }
  }

  private subscribeGlobal(
    contractAddress: string,
    widgetId: string,
    widgetType: "live-price" | "trade-feed",
    connectedPort: ConnectedPort
  ) {
    // Add to this port's subscriptions
    if (!connectedPort.subscriptions.has(contractAddress)) {
      connectedPort.subscriptions.set(contractAddress, []);
    }
    const portSubs = connectedPort.subscriptions.get(contractAddress)!;
    if (!portSubs.find((s) => s.widgetId === widgetId)) {
      portSubs.push({ contractAddress, widgetId, widgetType });
    }

    // Add to global subscriptions
    if (!this.allSubscriptions.has(contractAddress)) {
      this.allSubscriptions.set(contractAddress, []);
    }
    const globalSubs = this.allSubscriptions.get(contractAddress)!;
    const subKey = `${connectedPort.port}-${widgetId}`;
    if (!globalSubs.find((s) => s.widgetId === subKey)) {
      globalSubs.push({ contractAddress, widgetId: subKey, widgetType });
    }

    console.log(
      `[SharedWorker] 📡 Subscribed to ${contractAddress.substring(0, 8)}... (${
        globalSubs.length
      } total subscribers)`
    );

    // Check if we need to subscribe to SOL for price calculations
    this.updateLivePriceTracking();

    // Update subscriber count and log optimization
    this.updateTokenSubscriberCount(contractAddress);
    this.logSharedTokens();

    // Reconnect if WebSocket is closed (happens when all widgets were removed)
    if (!this.ws || this.ws.readyState === WebSocket.CLOSED) {
      console.log("[SharedWorker] 🔄 Reconnecting WebSocket...");
      this.intentionalClose = false; // Reset flag before reconnecting
      this.connect();
    } else {
      // Re-subscribe with updated filters
      this.updateWebSocketFilters();
    }
  }

  private unsubscribeGlobal(
    contractAddress: string,
    connectedPort: ConnectedPort
  ) {
    // Remove from port subscriptions
    connectedPort.subscriptions.delete(contractAddress);

    // Remove from global subscriptions
    const globalSubs = this.allSubscriptions.get(contractAddress);
    if (globalSubs) {
      // Remove all subscriptions from this port for this contract
      const filtered = globalSubs.filter(
        (s) => !s.widgetId.startsWith(`${connectedPort.port}-`)
      );

      if (filtered.length === 0) {
        this.allSubscriptions.delete(contractAddress);
        this.tokenSubscriberCount.delete(contractAddress);
        console.log(
          `[SharedWorker] 🗑️ No more subscribers for ${contractAddress.substring(
            0,
            8
          )}...`
        );
      } else {
        this.allSubscriptions.set(contractAddress, filtered);
        this.updateTokenSubscriberCount(contractAddress);
      }
    }

    // Check if we still need SOL subscription
    this.updateLivePriceTracking();

    // Re-subscribe with updated filters
    this.updateWebSocketFilters();
  }

  private syncExistingDataToPort(connectedPort: ConnectedPort) {
    // Send cached trade data to new tab if available
    for (const [contractAddress, trades] of this.tradeCache) {
      const subs = connectedPort.subscriptions.get(contractAddress);
      if (subs) {
        for (const sub of subs) {
          this.postMessageToPort(connectedPort.port, {
            type: "data",
            payload: {
              widgetId: sub.widgetId,
              data: { contractAddress, trades, timestamp: Date.now() },
            },
          });
        }
      }
    }
  }

  connect() {
    if (this.ws?.readyState === WebSocket.OPEN) return;

    if (!this.apiKey) {
      console.error("[SharedWorker] ❌ No API key configured!");
      this.broadcastToAllPorts({
        type: "error",
        payload: { message: "API key not configured" },
      });
      return;
    }

    const wsUrl = `wss://api.mobula.io`;
    console.log("[SharedWorker] 🔌 Connecting to Mobula...");

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log("[SharedWorker] ✅ Connected!");
        this.reconnectAttempts = 0;
        this.broadcastToAllPorts({ type: "connected" });

        this.updateWebSocketFilters();
        this.startPingInterval();
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleMessage(data);
        } catch (error) {
          console.error("[SharedWorker] Parse error:", error);
        }
      };

      this.ws.onerror = (error) => {
        console.error("[SharedWorker] ❌ WebSocket error:", error);
      };

      this.ws.onclose = () => {
        console.log("[SharedWorker] 🔌 Disconnected");
        this.broadcastToAllPorts({ type: "disconnected" });
        
        // Only attempt reconnect if it wasn't an intentional close
        if (!this.intentionalClose && this.connectedPorts.size > 0) {
          this.attemptReconnect();
        } else if (this.intentionalClose) {
          console.log("[SharedWorker] ✋ Intentional close, not reconnecting");
          this.intentionalClose = false; // Reset flag
        }
      };
    } catch (error) {
      console.error("[SharedWorker] ❌ Failed to create WebSocket:", error);
    }
  }

  private handleMessage(message: any) {
    console.log("[SharedWorker] Message received:", message);
    try {
      if (message.event === "ping" || message.event === "pong") {
        return;
      }

      if (message.type === "subscribed") {
        console.log("[SharedWorker] ✅ Subscription confirmed");
        return;
      }

      if (message.duplicateCount !== undefined) return;

      const tokenData = message.tokenData;
      if (!tokenData || !tokenData.address) {
        return;
      }

      const tokenAddress = tokenData.address;
      const subs = this.allSubscriptions.get(tokenAddress);
      if (!subs || subs.length === 0) return;

      // Extract price from tokenData
      const tokenPriceUSD = parseFloat(message.token_price || 0);
      const priceChange24h = parseFloat(
        tokenData.priceChange24hPercentage || 0
      );

      // Cache SOL price if this is SOL
      if (tokenAddress === SOL_ADDRESS) {
        this.solPriceUSD = tokenPriceUSD;
        console.log(`[SharedWorker] 💰 SOL price cached: $${tokenPriceUSD}`);
      }

      // Calculate price in SOL using cached SOL price
      const priceInSOL =
        this.solPriceUSD > 0 ? tokenPriceUSD / this.solPriceUSD : 0;

      // Broadcast price updates to live-price widgets
      for (const connectedPort of this.connectedPorts) {
        const portSubs = connectedPort.subscriptions.get(tokenAddress);
        if (!portSubs || portSubs.length === 0) continue;

        for (const sub of portSubs) {
          // Skip auto-subscribed SOL (internal use only)
          if (sub.widgetId === "__auto_sol__") continue;

          if (sub.widgetType === "live-price") {
            const priceData = {
              contractAddress: tokenAddress,
              price: tokenPriceUSD,
              priceInSOL: priceInSOL,
              priceChange24h: priceChange24h,
              timestamp: Date.now(),
            };

            this.postMessageToPort(connectedPort.port, {
              type: "data",
              payload: { widgetId: sub.widgetId, data: priceData },
            });
          }
        }
      }

      // Handle trade data ONLY if this is a trade event (has type and hash)
      if (message.type && message.hash) {
        const hasTradeFeedSubs = subs.some(
          (s) => s.widgetType === "trade-feed"
        );

        if (hasTradeFeedSubs) {
          const tradeType = message.type.toLowerCase(); // "buy" or "sell"

          const trade = {
            id: message.hash,
            price: tokenPriceUSD,
            amount: parseFloat(message.token_amount_usd || 0),
            timestamp: parseInt(
              message.timestamp || message.date || Date.now()
            ),
            type: tradeType,
            txHash: message.hash,
          };

          const existingTrades = this.tradeCache.get(tokenAddress) || [];
          const updatedTrades = [trade, ...existingTrades].slice(0, 20);
          this.tradeCache.set(tokenAddress, updatedTrades);

          // Broadcast trade to trade-feed widgets
          for (const connectedPort of this.connectedPorts) {
            const portSubs = connectedPort.subscriptions.get(tokenAddress);
            if (!portSubs || portSubs.length === 0) continue;

            for (const sub of portSubs) {
              if (sub.widgetType === "trade-feed") {
                this.postMessageToPort(connectedPort.port, {
                  type: "data",
                  payload: {
                    widgetId: sub.widgetId,
                    data: {
                      contractAddress: tokenAddress,
                      trades: updatedTrades,
                      timestamp: Date.now(),
                    },
                  },
                });
              }
            }
          }
        }
      }
    } catch (error) {
      console.error("[SharedWorker] ❌ Error handling message:", error);
    }
  }

  private updateLivePriceTracking() {
    // Count real live-price widgets (excluding auto-subscribed SOL)
    let hasRealLivePriceWidgets = false;
    for (const [address, subs] of this.allSubscriptions.entries()) {
      // Skip SOL itself when checking
      if (address === SOL_ADDRESS) continue;
      
      if (subs.some((s) => s.widgetType === "live-price")) {
        hasRealLivePriceWidgets = true;
        break;
      }
    }

    const previousState = this.hasLivePriceWidgets;
    this.hasLivePriceWidgets = hasRealLivePriceWidgets;

    // Add SOL only if we have REAL live-price widgets (not including SOL itself)
    if (hasRealLivePriceWidgets && !this.allSubscriptions.has(SOL_ADDRESS)) {
      this.allSubscriptions.set(SOL_ADDRESS, [
        {
          contractAddress: SOL_ADDRESS,
          widgetId: "__auto_sol__",
          widgetType: "live-price",
        },
      ]);
      console.log(
        "[SharedWorker] 🌟 Auto-subscribed to SOL for price calculations"
      );
    }
    // Remove SOL if no more real live-price widgets
    else if (!hasRealLivePriceWidgets && previousState) {
      const solSubs = this.allSubscriptions.get(SOL_ADDRESS);
      if (solSubs) {
        // Only remove if SOL was only auto-subscribed (no manual subscriptions)
        const hasManualSolSub = solSubs.some(
          (s) => s.widgetId !== "__auto_sol__"
        );
        if (!hasManualSolSub) {
          this.allSubscriptions.delete(SOL_ADDRESS);
          console.log(
            "[SharedWorker] 🌙 Auto-unsubscribed from SOL (no more live-price widgets)"
          );
        }
      }
    }
  }

  private startPingInterval() {
    this.pingInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ event: "ping" }));
      }
    }, 30000);
  }

  private updateWebSocketFilters() {
    if (this.ws?.readyState !== WebSocket.OPEN) return;

    const trackedTokens = Array.from(this.allSubscriptions.keys());

    if (trackedTokens.length === 0) {
      console.log("[SharedWorker] No tokens to track, closing connection");
      if (this.ws) {
        this.intentionalClose = true; // Mark as intentional close
        this.ws.close();
        this.ws = null;
      }
      if (this.pingInterval) {
        clearInterval(this.pingInterval);
        this.pingInterval = null;
      }
      return;
    }

    // Build token list for subscription
    const tokens = trackedTokens.map((address) => ({
      blockchain: "solana",
      address: address,
    }));

    const subscriptionMessage = {
      type: "token-details",
      authorization: this.apiKey,
      payload: {
        tokens,
        subscriptionTracking: true,
      },
    };

    this.ws.send(JSON.stringify(subscriptionMessage));
    console.log(
      `[SharedWorker] 🎯 Subscribed to ${trackedTokens.length} tokens:`,
      ...trackedTokens
    );
  }

  private attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error("[SharedWorker] Max reconnection attempts reached");
      return;
    }

    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);

    const delay = Math.min(1000 * 2 ** this.reconnectAttempts, 30000);
    this.reconnectAttempts++;

    console.log(`[SharedWorker] Reconnecting in ${delay}ms...`);
    this.reconnectTimeout = setTimeout(() => this.connect(), delay);
  }

  disconnect() {
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
    if (this.pingInterval) clearInterval(this.pingInterval);
    this.ws?.close();
    this.ws = null;
    this.allSubscriptions.clear();
    this.tradeCache.clear();
  }

  private broadcastToAllPorts(message: WSMessage) {
    for (const connectedPort of this.connectedPorts) {
      this.postMessageToPort(connectedPort.port, message);
    }
  }

  private postMessageToPort(port: MessagePort, message: WSMessage) {
    try {
      port.postMessage(message);
    } catch (error) {
      console.error("[SharedWorker] Failed to post message to port:", error);
    }
  }

  private updateTokenSubscriberCount(contractAddress: string) {
    const uniqueTabs = new Set<MessagePort>();
    for (const connectedPort of this.connectedPorts) {
      if (connectedPort.subscriptions.has(contractAddress)) {
        uniqueTabs.add(connectedPort.port);
      }
    }
    this.tokenSubscriberCount.set(contractAddress, uniqueTabs.size);
  }

  private logSharedTokens() {
    const sharedTokens = Array.from(this.tokenSubscriberCount.entries())
      .filter(([_, count]) => count > 1)
      .sort((a, b) => b[1] - a[1]);

    if (sharedTokens.length > 0) {
      console.log(
        `[SharedWorker] 🔥 OPTIMIZATION ACTIVE! ${sharedTokens.length} tokens shared across tabs:`
      );
      sharedTokens.forEach(([address, count]) => {
        const subs = this.allSubscriptions.get(address)?.length || 0;
        console.log(
          `  • ${address.substring(
            0,
            8
          )}... → ${count} tabs, ${subs} widgets (saving ${
            count - 1
          }x bandwidth!)`
        );
      });

      // Calculate total optimization
      const actualConnections = sharedTokens.length;
      const withoutSharing = sharedTokens.reduce(
        (sum, [_, count]) => sum + count,
        0
      );
      const savings = Math.round(
        ((withoutSharing - actualConnections) / withoutSharing) * 100
      );

      console.log(
        `[SharedWorker] 💰 Bandwidth saved: ${savings}% (${withoutSharing} connections → ${actualConnections})`
      );
    }
  }
}

// Initialize SharedWorker
const manager = new SharedWebSocketManager();

// Listen for new connections from tabs
// @ts-ignore - onconnect exists in SharedWorker global scope
self.onconnect = (event: MessageEvent) => {
  const port = event.ports[0];
  manager.addPort(port);

  port.start();
};

export {};
