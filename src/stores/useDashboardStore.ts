import { create } from "zustand";
import { nanoid } from "nanoid";
import type { Widget, GridLayout } from "../types";

interface DashboardState {
  widgets: Widget[];
  layouts: GridLayout[];
  isAddingWidget: boolean;
}

interface DashboardActions {
  addWidget: (type: Widget["type"], contractAddress: string) => void;
  removeWidget: (id: string) => void;
  updateLayout: (layouts: GridLayout[]) => void;
  setIsAddingWidget: (isAdding: boolean) => void;
  loadFromURL: (widgets: Widget[]) => void;
}

type DashboardStore = DashboardState & DashboardActions;

// Default widget sizes
const DEFAULT_WIDGET_SIZE = {
  "live-price": { w: 2, h: 2 },
  "trade-feed": { w: 3, h: 4 },
};

export const useDashboardStore = create<DashboardStore>((set, get) => ({
  // State
  widgets: [],
  layouts: [],
  isAddingWidget: false,

  // Actions
  addWidget: (type, contractAddress) => {
    const id = nanoid();
    const { w, h } = DEFAULT_WIDGET_SIZE[type];

    // Find next available position
    const widgets = get().widgets;
    const y =
      widgets.length > 0 ? Math.max(...widgets.map((w) => w.y + w.h)) : 0;

    const newWidget: Widget = {
      id,
      type,
      contractAddress,
      x: 0,
      y,
      w,
      h,
    };

    set((state) => ({
      widgets: [...state.widgets, newWidget],
      layouts: [
        ...state.layouts,
        {
          i: id,
          x: newWidget.x,
          y: newWidget.y,
          w: newWidget.w,
          h: newWidget.h,
        },
      ],
      isAddingWidget: false,
    }));
  },

  removeWidget: (id) => {
    set((state) => ({
      widgets: state.widgets.filter((w) => w.id !== id),
      layouts: state.layouts.filter((l) => l.i !== id),
    }));
  },

  updateLayout: (layouts) => {
    set((state) => {
      // Update widget positions based on layout changes
      const updatedWidgets = state.widgets.map((widget) => {
        const layout = layouts.find((l) => l.i === widget.id);
        if (layout) {
          return {
            ...widget,
            x: layout.x,
            y: layout.y,
            w: layout.w,
            h: layout.h,
          };
        }
        return widget;
      });

      return {
        widgets: updatedWidgets,
        layouts,
      };
    });
  },

  setIsAddingWidget: (isAdding) => {
    set({ isAddingWidget: isAdding });
  },

  loadFromURL: (widgets) => {
    const layouts = widgets.map((w) => ({
      i: w.id,
      x: w.x,
      y: w.y,
      w: w.w,
      h: w.h,
    }));

    set({ widgets, layouts });
  },
}));
