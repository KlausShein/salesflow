# 🖨️ PrintPOS Pro

**Print Shop POS & Financial Distribution Management System**

A modern, professional desktop-style point-of-sale and financial management frontend built with React + TypeScript + Vite. Designed to look and feel like a real installable Windows SaaS application.

---

## ✨ Features

- **Dashboard** with live stat cards (Sales, Expenses, Net Income, Transactions)
- **Sales Analytics** line chart with weekly trend visualization
- **Auto Financial Distribution** — computes Equity, Rental, Electricity, Water, Share, Savings from total sales
- **New Sale Panel** — add services with qty controls, price inputs, and real-time total computation
- **Transactions Table** — recent sales & expenses with badge styling
- **Quick Actions** — one-click navigation shortcuts
- **Dark Blue Gradient Sidebar** with active page indicator
- **Live Clock** in topbar
- **TypeScript throughout** — fully typed interfaces, hooks, and components

---

## 🗂️ Project Structure

```
src/
├── components/
│   ├── dashboard/
│   │   ├── SalesChart.tsx          # SVG line chart with smooth curves
│   │   ├── TransactionsTable.tsx   # Transactions with badge styles
│   │   └── QuickActions.tsx        # Quick action card buttons
│   ├── distribution/
│   │   └── DistributionPanel.tsx   # Auto distribution with progress bars
│   ├── layout/
│   │   ├── Sidebar.tsx             # Dark blue gradient nav sidebar
│   │   └── Topbar.tsx              # Top header with live date
│   ├── sales/
│   │   └── NewSalePanel.tsx        # POS panel with qty controls
│   └── ui/
│       └── index.tsx               # Reusable: StatCard, Card, Badge, ProgressBar
├── data/
│   └── seed.ts                     # Mock data: transactions, services, dist categories
├── hooks/
│   └── index.ts                    # useTransactions, useSaleCart, useLiveClock, useActivePage
├── pages/
│   └── DashboardPage.tsx           # Dashboard layout composition
├── styles/
│   └── globals.css                 # All CSS variables, component styles
├── types/
│   └── index.ts                    # TypeScript interfaces & types
├── utils/
│   └── helpers.ts                  # formatPeso, computeStats, computeDistribution, etc.
├── App.tsx                         # Root component, state management
└── main.tsx                        # React entry point
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

```bash
cd printpos
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

### Build for Production

```bash
npm run build
npm run preview
```

---

## 💰 Financial Distribution Categories

| Category    | Percentage | Color     |
|-------------|-----------|-----------|
| Equity      | 40%       | Blue      |
| Rental      | 15%       | Purple    |
| Electricity | 12%       | Amber     |
| Water       | 8%        | Cyan      |
| Share       | 15%       | Green     |
| Savings     | 10%       | Orange    |
| **Total**   | **100%**  |           |

---

## 🎨 Design System

- **Primary Font**: Plus Jakarta Sans
- **Mono Font**: JetBrains Mono (all currency values)
- **Icons**: Tabler Icons webfont
- **Color Palette**: Navy sidebar (`#050d1a → #152b58`), Blue accent (`#2563eb`), Cyan (`#38bdf8`)
- **Border Radius**: 14px cards, 10px inner, 8px buttons
- **Currency**: Philippine Peso (₱)

---

## 🔌 Services (POS)

| Service            | Default Price |
|--------------------|--------------|
| Document Printing  | ₱5.00/page   |
| Photocopy          | ₱2.00/page   |
| Lamination         | ₱25.00       |
| ID Picture         | ₱50.00       |

Prices are editable directly in the New Sale panel.

---

## 📁 Key TypeScript Interfaces

```ts
interface Transaction { id, type, description, amount, date, time, user }
interface Service     { id, name, icon, unitPrice, category, isActive }
interface SaleItem    { serviceId, serviceName, qty, unitPrice, total }
interface DistributionCategory { id, name, percentage, color, bgColor }
interface DashboardStats { totalSales, totalExpenses, netIncome, transactionCount, ... }
```

---

## 🛣️ Roadmap (Future Pages)

- [ ] Sales history with filters & export
- [ ] Expense management with categories
- [ ] Inventory tracking
- [ ] Customer database (CRM)
- [ ] PDF/Excel reports
- [ ] User management & roles
- [ ] Settings (shop info, pricing)
- [ ] Electron wrapper for true desktop app

---

## 📄 License

MIT — Free to use and modify for commercial print shop operations.
