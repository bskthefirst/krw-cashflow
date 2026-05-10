# KRW Cashflow

Minimal interactive dashboard for **after-tax pure cashflow** in KRW (발행어음 CMA, ETH staking, GPIX/GPIQ). Logic matches the spreadsheet model: daily pretax × (1 − tax) for CMA/ETH; GPIX/GPIQ as a single **monthly after-tax** control value.

## Features

- **Dashboard**: current calendar month total & blended daily rate; 24-month bar trend; source breakdown.
- **Assets**: edit pretax rates, tax assumptions, GPIX/GPIQ monthly total, and forecast start month. Changes persist in `localStorage` and update the dashboard immediately.

## Local development

```bash
npm install
npm run dev
```

Open the URL shown in the terminal (usually `http://localhost:5173`).

## Scripts

| Command        | Description              |
| -------------- | ------------------------ |
| `npm run dev`  | Vite dev server          |
| `npm run build`| Typecheck + production build |
| `npm run preview` | Preview production build locally |
| `npm test`     | Vitest unit tests        |
| `npm run lint` | ESLint                   |

## Private GitHub repository

1. Create a **private** repo on GitHub (empty, no README if you prefer).
2. From this folder:

   ```bash
   git init
   git add .
   git commit -m "Initial KRW cashflow app"
   git branch -M main
   git remote add origin https://github.com/<you>/<repo>.git
   git push -u origin main
   ```

## Deploy with a URL (private repo)

Recommended: **[Vercel](https://vercel.com)** (supports importing **private** GitHub repos).

1. Sign in to Vercel with GitHub.
2. **Add New Project** → import your private `cashflow` repository.
3. Framework preset: **Vite**. Build command: `npm run build`. Output directory: `dist`.
4. Deploy. You get a URL like `https://<project>.vercel.app`.

The site is a static SPA; no server secrets are required. To restrict who can open the URL, use **Vercel Authentication** (team feature) or put the app behind your own auth — GitHub “private” alone does not hide the deployed URL.

## Default assumptions (editable in-app)

| Source      | Default                         |
| ----------- | ------------------------------- |
| CMA         | 363 KRW/day pretax, 15.4% tax   |
| ETH staking | 340 KRW/day pretax, 10% tax    |
| GPIX/GPIQ   | 8,500 KRW/month after tax       |

## License

Private / personal use.
