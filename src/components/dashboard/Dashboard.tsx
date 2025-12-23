import { useEffect } from "react";
import GridLayout from "react-grid-layout";
import { useDashboardStore } from "../../stores/useDashboardStore";
import { useWebSocketStore } from "../../stores/useWebSocketStore";
import { LivePriceWidget } from "../widgets/LivePriceWidget";
import { TradeFeedWidget } from "../widgets/TradeFeedWidget";
import { AddWidgetModal } from "./AddWidgetModal";
import { loadStateFromURL, debouncedUpdateURL } from "../../utils/urlState";
import type { WidgetType, GridLayout as CustomLayout } from "../../types";
import "react-grid-layout/css/styles.css";
import "./Dashboard.css";

export function Dashboard() {
  const widgets = useDashboardStore((state) => state.widgets);
  const layouts = useDashboardStore((state) => state.layouts);
  const addWidget = useDashboardStore((state) => state.addWidget);
  const removeWidget = useDashboardStore((state) => state.removeWidget);
  const updateLayout = useDashboardStore((state) => state.updateLayout);
  const isAddingWidget = useDashboardStore((state) => state.isAddingWidget);
  const setIsAddingWidget = useDashboardStore(
    (state) => state.setIsAddingWidget
  );
  const loadFromURL = useDashboardStore((state) => state.loadFromURL);

  const initWorker = useWebSocketStore((state) => state.initWorker);
  const isConnected = useWebSocketStore((state) => state.isConnected);

  // Initialize WebSocket worker on mount
  useEffect(() => {
    initWorker();
  }, [initWorker]);

  // Load dashboard state from URL on mount
  useEffect(() => {
    const widgetsFromURL = loadStateFromURL();
    if (widgetsFromURL.length > 0) {
      loadFromURL(widgetsFromURL);
    }
  }, [loadFromURL]);

  // Sync dashboard state to URL (debounced)
  useEffect(() => {
    if (widgets.length > 0) {
      debouncedUpdateURL(widgets);
    } else {
      // Clear URL when no widgets
      const url = new URL(window.location.href);
      url.searchParams.delete("state");
      window.history.replaceState({}, "", url.toString());
    }
  }, [widgets]);

  const handleLayoutChange = (newLayout: any[]) => {
    const customLayouts: CustomLayout[] = newLayout.map((l: any) => ({
      i: l.i,
      x: l.x,
      y: l.y,
      w: l.w,
      h: l.h,
    }));
    updateLayout(customLayouts);
  };

  const handleAddWidget = (type: WidgetType, contractAddress: string) => {
    addWidget(type, contractAddress);
  };

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="header-content">
          <h1>🪙 Solana Meme Coin Tracker</h1>
          <div className="header-actions">
            <div
              className={`connection-status ${
                isConnected ? "connected" : "disconnected"
              }`}
            >
              <span className="status-dot"></span>
              {isConnected ? "Connected" : "Disconnected"}
            </div>
            <button
              className="btn-add-widget"
              onClick={() => setIsAddingWidget(true)}
            >
              + Add Widget
            </button>
          </div>
        </div>
      </header>

      <main className="dashboard-content">
        {widgets.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📊</div>
            <h2>No widgets yet</h2>
            <p>Add your first widget to start tracking meme coins!</p>
            <button
              className="btn-primary"
              onClick={() => setIsAddingWidget(true)}
            >
              Add Widget
            </button>
          </div>
        ) : (
          // @ts-ignore - Type issues with react-grid-layout
          <GridLayout
            className="grid-layout"
            layout={layouts as any}
            cols={12}
            rowHeight={100}
            width={1200}
            // @ts-ignore
            onLayoutChange={handleLayoutChange}
            isDraggable={true}
            isResizable={true}
            compactType="vertical"
            preventCollision={false}
          >
            {widgets.map((widget) => (
              <div key={widget.id} className="grid-item">
                {widget.type === "live-price" ? (
                  <LivePriceWidget
                    widget={widget}
                    onRemove={() => removeWidget(widget.id)}
                  />
                ) : (
                  <TradeFeedWidget
                    widget={widget}
                    onRemove={() => removeWidget(widget.id)}
                  />
                )}
              </div>
            ))}
          </GridLayout>
        )}
      </main>

      <AddWidgetModal
        isOpen={isAddingWidget}
        onClose={() => setIsAddingWidget(false)}
        onAdd={handleAddWidget}
      />
    </div>
  );
}
