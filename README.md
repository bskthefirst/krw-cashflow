# KRW Cashflow

Minimal interactive dashboard for **after-tax pure cashflow** in KRW (발행어음 CMA, ETH staking, GPIX/GPIQ). Logic matches the spreadsheet model: daily pretax × (1 − tax) for CMA/ETH; GPIX/GPIQ as a single **monthly after-tax** control value.

## Live site (GitHub Pages)

After pushing to `main`, the app deploys to:

**https://bskthefirst.github.io/krw-cashflow/**

(First deploy: open **Settings → Pages** and set **Source** to **GitHub Actions** if the workflow has not run yet.)

## Features

- **Dashboard**: current calendar month total & blended daily rate; 24-month bar trend; source breakdown.
- **Assets**: edit pretax rates, tax assumptions, GPIX/GPIQ monthly total, and forecast start month. Changes persist in `localStorage` and update the dashboard immediately.

## Local development

```bash
npm install
npm run dev
```

Opens at `http://localhost:5173` with asset paths at `/` (no repo prefix).

## Scripts

| Command           | Description                  |
| ----------------- | ---------------------------- |
| `npm run dev`     | Vite dev server              |
| `npm run build`   | Typecheck + production build + `404.html` for Pages |
| `npm run preview` | Preview production build locally (`vite preview`) |
| `npm test`        | Vitest unit tests            |
| `npm run lint`    | ESLint                       |

Production builds on **GitHub Actions** set `GITHUB_REPOSITORY` so Vite uses base `/krw-cashflow/`. Local builds use `/`.

## Default assumptions (editable in-app)

| Source      | Default                         |
| ----------- | ------------------------------- |
| CMA         | 363 KRW/day pretax, 15.4% tax   |
| ETH staking | 340 KRW/day pretax, 10% tax    |
| GPIX/GPIQ   | 8,500 KRW/month after tax       |

## License

Personal use.
