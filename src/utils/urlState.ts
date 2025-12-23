import type { Widget } from "../types";

/**
 * URL State Management
 * Encodes/decodes dashboard state in query parameters for sharing
 */

interface DashboardState {
  widgets: Widget[];
}

export function encodeStateToURL(state: DashboardState): string {
  const encoded = btoa(JSON.stringify(state.widgets));
  return encoded;
}

export function decodeStateFromURL(encoded: string): Widget[] {
  try {
    const decoded = atob(encoded);
    const widgets = JSON.parse(decoded) as Widget[];
    return widgets;
  } catch (error) {
    console.error("Failed to decode state from URL:", error);
    return [];
  }
}

export function updateURLWithState(widgets: Widget[]) {
  const encoded = encodeStateToURL({ widgets });
  const url = new URL(window.location.href);
  url.searchParams.set("state", encoded);
  window.history.replaceState({}, "", url.toString());
}

export function loadStateFromURL(): Widget[] {
  const url = new URL(window.location.href);
  const encoded = url.searchParams.get("state");

  if (!encoded) return [];

  return decodeStateFromURL(encoded);
}

// Debounced version to avoid spamming history
let updateTimeout: ReturnType<typeof setTimeout>;

export function debouncedUpdateURL(widgets: Widget[], delay = 500) {
  clearTimeout(updateTimeout);
  updateTimeout = setTimeout(() => {
    updateURLWithState(widgets);
  }, delay);
}
