// Widget types
export type WidgetType = "live-price" | "trade-feed";

export interface Widget {
  id: string;
  type: WidgetType;
  contractAddress: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

// WebSocket message types
export interface WSMessage {
  type:
    | "subscribe"
    | "unsubscribe"
    | "data"
    | "error"
    | "connected"
    | "disconnected";
  payload?: unknown;
}

export interface WSSubscribeMessage extends WSMessage {
  type: "subscribe";
  payload: {
    contractAddress: string;
    widgetId: string;
    widgetType: WidgetType;
  };
}

export interface WSUnsubscribeMessage extends WSMessage {
  type: "unsubscribe";
  payload: {
    contractAddress: string;
    widgetId: string;
  };
}

// Mobula API response types
export interface PriceData {
  contractAddress: string;
  price: number;
  priceInSOL: number;
  priceChange24h: number;
  timestamp: number;
}

export interface Trade {
  id: string;
  price: number;
  amount: number;
  timestamp: number;
  type: "buy" | "sell";
  txHash: string;
}

export interface TradeData {
  contractAddress: string;
  trades: Trade[];
  timestamp: number;
}

export interface WSDataMessage extends WSMessage {
  type: "data";
  payload: {
    widgetId: string;
    data: PriceData | TradeData;
  };
}

// Grid layout types (compatible with react-grid-layout)
export interface GridLayout {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  maxW?: number;
  minH?: number;
  maxH?: number;
  static?: boolean;
  isDraggable?: boolean;
  isResizable?: boolean;
}
