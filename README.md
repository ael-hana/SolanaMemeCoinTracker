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
┌────────────────────────────────────────────────────────────┐
│                    MULTI-TAB SUPPORT                       │
│  Tab 1            Tab 2            Tab 3                   │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐            │
│  │Dashboard │    │Dashboard │    │Dashboard │            │
│  │(React 19)│    │(React 19)│    │(React 19)│            │
│  └────┬─────┘    └────┬─────┘    └────┬─────┘            │
│       │               │               │                    │
│       │ MessagePort   │ MessagePort   │ MessagePort       │
│       └───────────────┼───────────────┘                    │
│                       ▼                                     │
│  ┌──────────────────────────────────────────────────────┐ │
│  │           SharedWorker (1 instance)                   │ │
│  │                                                        │ │
│  │  ┌─────────────────────────────────────────────────┐ │ │
│  │  │ Single WebSocket Connection (Mobula API)        │ │ │
│  │  │ • Auto-subscribe to SOL for price calculations  │ │ │
│  │  │ • Token subscription deduplication              │ │ │
│  │  │ • Closes when 0 widgets (saves resources)       │ │ │
│  │  │ • Auto-reconnects when widget added             │ │ │
│  │  │ • Broadcasts data to all tabs                   │ │ │
│  │  └─────────────────────────────────────────────────┘ │ │
│  └──────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────┘
```

### Pourquoi cette architecture?

1. **SharedWorker** = 1 WebSocket partagé entre TOUS les onglets → Économie massive de bande passante
2. **Automatic SOL subscription** = Prix en SOL calculés automatiquement pour tous les tokens
3. **Smart connection management** = Ferme la connexion si 0 widgets → 0 ressources gaspillées
4. **Token deduplication** = Si 2 onglets trackent le même token → 1 seule souscription
5. **Zustand** = State management minimal → Pas de re-renders inutiles
6. **React.memo** sur widgets → Re-render uniquement quand leurs data changent
7. **URL State** = Dashboard partageable sans backend

### Exemple d'optimisation

```
Sans SharedWorker:
- Tab 1 tracking WIF → 1 WebSocket
- Tab 2 tracking WIF → 1 WebSocket
- Tab 3 tracking WIF → 1 WebSocket
Total: 3 WebSockets, 3x la bande passante

Avec SharedWorker:
- Tabs 1, 2, 3 tracking WIF → 1 WebSocket partagé
Total: 1 WebSocket, économie de 66% ! 🔥
```

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
│   └── websocket.shared-worker.ts # SharedWorker multi-onglets
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
- **SharedWorker**: WebSocket partagé multi-onglets

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

1. **SharedWorker**: 1 WebSocket partagé entre tous les onglets → 66-90% de bande passante économisée
2. **Auto SOL subscription**: Prix en SOL calculés automatiquement sans souscription manuelle
3. **Smart connection management**: Ferme la connexion WebSocket si 0 widgets actifs
4. **Token deduplication**: Plusieurs widgets sur même token = 1 seule souscription API
5. **React.memo**: Widgets ne re-render que si nécessaire
6. **Zustand selectors**: Souscriptions granulaires
7. **Debounced URL updates**: Évite spam de l'historique
8. **rolldown-vite**: Build 3-5x plus rapide

## 🎯 Prochaines étapes

1. **Obtenir clé API Mobula** et l'ajouter dans `.env`
2. **Adapter le worker** selon le format réel de l'API Mobula
3. **Tester avec vrais tokens** Solana
4. **Déployer sur Vercel**

## 📚 Documentation

- [Mobula WebSocket API](https://docs.mobula.io/indexing-stream/stream/websocket/multi-events-stream)
- [React Grid Layout](https://github.com/react-grid-layout/react-grid-layout)
- [Zustand](https://github.com/pmndrs/zustand)
