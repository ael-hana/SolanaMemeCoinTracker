# 🪙 Solana Meme Coin Tracker

Dashboard en temps réel pour tracker les meme coins Solana avec des widgets configurables et drag-and-drop.

## 🎯 Caractéristiques

- **Widget Live Price**: Prix en temps réel (USD/SOL) + variation 24h
- **Widget Trade Feed**: Flux des 20 derniers trades en temps réel
- **Drag & Drop**: Déplacez et redimensionnez les widgets
- **URL State**: Partagez votre dashboard via l'URL
- **WebSocket Worker**: Performance optimale avec un seul WebSocket dans un Web Worker
- **Dark/Light Mode**: Support automatique du thème système

## 🏗️ Architecture (Performance-First)

```
┌──────────────────────────────────────────────┐
│ Main Thread (UI)                            │
│                                              │
│  ┌────────────┐      ┌──────────────────┐  │
│  │  Dashboard │─────▶│ Zustand Stores   │  │
│  │ (React 19) │◀─────│ - Dashboard      │  │
│  └────────────┘      │ - WebSocket Data │  │
│                      └──────────────────┘  │
│                              │              │
│                              │ postMessage  │
│                              ▼              │
│  ┌──────────────────────────────────────┐  │
│  │ Web Worker                           │  │
│  │                                      │  │
│  │  ┌───────────────────────────────┐  │  │
│  │  │ Single WebSocket Connection    │  │  │
│  │  │ (Mobula API)                   │  │  │
│  │  │ - Gère toutes les souscriptions│  │  │
│  │  │ - Reconnexion automatique      │  │  │
│  │  │ - Broadcast data → main thread │  │  │
│  │  └───────────────────────────────┘  │  │
│  └──────────────────────────────────────┘  │
└──────────────────────────────────────────────┘
```

### Pourquoi cette architecture?

1. **Web Worker** = WebSocket sur thread séparé → UI reste fluide
2. **Un seul WebSocket** = Optimal pour les ressources réseau
3. **Zustand** = State management minimal → Pas de re-renders inutiles
4. **React.memo** sur widgets → Re-render uniquement quand leurs data changent
5. **URL State** = Dashboard partageable sans backend

## 🚀 Installation

```bash
# Installer les dépendances
npm install

# Configurer la clé API Mobula
cp .env.example .env
# Éditer .env et ajouter votre VITE_MOBULA_API_KEY

# Lancer en dev
npm run dev
```

### 🧪 Dashboard de test

URL avec widgets pré-configurés (WIF + autres tokens populaires):

```
http://localhost:5174/?state=W3siaWQiOiJMaE1tNHF4al9CWmpieHdWaHlIclciLCJ0eXBlIjoibGl2ZS1wcmljZSIsImNvbnRyYWN0QWRkcmVzcyI6IkVLcFFHU0p0ak1GcUtaOUtRYW5TcVlYUmNGOGZCb3B6TEhZeGRNNjV6Y2ptIiwieCI6MCwieSI6MCwidyI6MiwiaCI6Mn0seyJpZCI6IjhYZmltSUNjRDZ5VVFlX2JIdVd4RCIsInR5cGUiOiJ0cmFkZS1mZWVkIiwiY29udHJhY3RBZGRyZXNzIjoiRVBqRldkZDVBdWZxU1NxZU0ycU4xeHp5YmFwQzhHNHdFR0drWnd5VER0MXYiLCJ4IjoyLCJ5IjowLCJ3Ijo1LCJoIjoyfSx7ImlkIjoiX1VwbHFFZE5mOVp0Nm1LbE4zMmVzIiwidHlwZSI6InRyYWRlLWZlZWQiLCJjb250cmFjdEFkZHJlc3MiOiJEVnI2MlBTalZDckV3bVdWUmRLUUFCcUp1bWIxam1KR0thOEJrVUc2cHVtcCIsIngiOjIsInkiOjIsInciOjQsImgiOjR9LHsiaWQiOiJvWFpoQS02M0RmcTY0T1dtVDljTUoiLCJ0eXBlIjoibGl2ZS1wcmljZSIsImNvbnRyYWN0QWRkcmVzcyI6Imh0dHA6Ly9sb2NhbGhvc3Q6NTE3NC8%2Fc3RhdGU9VzNzaWFXUWlPaUpNYUUxdE5IRjRhbDlDV21waWVIZFdhSGxJY2xjaUxDSjBlWEJsSWpvaWJHbDJaUzF3Y21salpTSXNJbU52Ym5SeVlXTjBRV1JrY21WemN5STZJa1ZMY0ZGSFUwcDBhazFHY1V0YU9VdFJZVzVUY1ZsWVVtTkdPR1pDYjNCNlRFaFplR1JOTmpWNlkycHRJaXdpZUNJNk1Dd2llU0k2TUN3aWR5STZNaXdpYUNJNk1uMHNleUpwWkNJNklqaFlabWx0U1VOalJEWjVWVkZsWDJKSWRWZDRSQ0lzSW5SNWNHVWlPaUowY21Ga1pTMW1aV1ZrSWl3aVkyOXVkSEpoWTNSQlpHUnlaWE56SWpvaVJWQnFSbGRrWkRWQmRXWnhVMU54WlUweWNVNHhlSHA1WW1Gd1F6aEhOSGRGUjBkclduZDVWRVIwTVhZaUxDSjRJam95TENKNUlqb3dMQ0ozSWpvMUxDSm9Jam95ZlN4N0ltbGtJam9pWDFWd2JIRkZaRTVtT1ZwME5tMUxiRTR6TW1Weklpd2lkSGx3WlNJNkluUnlZV1JsTFdabFpXUWlMQ0pqYjI1MGNtRmpkRUZrWkhKbGMzTWlPaUpFVm5JMk1sQlRhbFpEY2tWM2JWZFdVbVJMVVVGQ2NVcDFiV0l4YW0xS1IwdGhPRUpyVlVjMmNIVnRjQ0lzSW5naU9qY3NJbmtpT2pBc0luY2lPalFzSW1naU9qUjlYUSUzRCUzRCIsIngiOjAsInkiOjIsInciOjIsImgiOjJ9XQ%3D%3D
```

## 🔧 Configuration

### Clé API Mobula

1. Aller sur [Mobula API](https://docs.mobula.io/)
2. Obtenir une clé API
3. Ajouter dans `.env`:
   ```
   VITE_MOBULA_API_KEY=votre_cle_api_ici
   ```

## 📁 Structure du projet

```
src/
├── components/
│   ├── dashboard/
│   │   ├── Dashboard.tsx          # Composant principal avec grid
│   │   ├── AddWidgetModal.tsx     # Modal d'ajout de widget
│   └── widgets/
│       ├── LivePriceWidget.tsx    # Widget prix en temps réel
│       ├── TradeFeedWidget.tsx    # Widget flux de trades
├── stores/
│   ├── useDashboardStore.ts       # État du dashboard (Zustand)
│   └── useWebSocketStore.ts       # Données WebSocket (Zustand)
├── workers/
│   └── websocket.worker.ts        # Worker WebSocket
├── utils/
│   └── urlState.ts                # Sync état ↔ URL
└── types/
    └── index.ts                   # Types TypeScript
```

## 🎨 Utilisation

### Ajouter un widget

1. Cliquer sur "+ Add Widget"
2. Choisir le type (Live Price ou Trade Feed)
3. Entrer l'adresse du contrat Solana
4. Le widget apparaît dans le dashboard

### Déplacer/Redimensionner

- **Drag**: Cliquer et glisser le widget
- **Resize**: Tirer depuis le coin bas-droit

### Supprimer

- Cliquer sur le "×" en haut à droite du widget

### Partager

- L'URL se met à jour automatiquement
- Copier l'URL et la partager
- Le destinataire verra le même dashboard

## 🛠️ Stack Technique

- **React 19.2**: Framework avec nouvelles features
- **TypeScript 5.9**: Strict mode
- **Zustand 5.0**: State management léger
- **react-grid-layout**: Drag & drop
- **rolldown-vite 7.2.5**: Build ultra-rapide
- **Web Workers**: WebSocket sur thread séparé

## 📝 Scripts

```bash
npm run dev      # Serveur de développement
npm run build    # Build production
npm run lint     # Vérification ESLint
npm run preview  # Preview du build
```

## 🚢 Déploiement (Vercel)

Build automatique avec `npm run build`, output dans `dist/`

## 🔥 Optimisations Implémentées

1. **WebSocket Worker**: Thread séparé pour I/O réseau
2. **React.memo**: Widgets ne re-render que si nécessaire
3. **Zustand selectors**: Souscriptions granulaires
4. **Debounced URL updates**: Évite spam de l'historique
5. **rolldown-vite**: Build 3-5x plus rapide

## 🎯 Prochaines étapes

1. **Obtenir clé API Mobula** et l'ajouter dans `.env`
2. **Adapter le worker** selon le format réel de l'API Mobula
3. **Tester avec vrais tokens** Solana
4. **Déployer sur Vercel**

## 📚 Documentation

- [Mobula WebSocket API](https://docs.mobula.io/indexing-stream/stream/websocket/multi-events-stream)
- [React Grid Layout](https://github.com/react-grid-layout/react-grid-layout)
- [Zustand](https://github.com/pmndrs/zustand)
