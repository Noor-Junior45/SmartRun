# CLOUD_RUN_DEPLOY.md (Deployment & Infra Checklist)

## Host & Port Binding
- **Host**: `0.0.0.0`
- **Port**: Dynamically reads `process.env.PORT || 8080` (runs on `3000` in AI Studio dev environment, `8080` on Cloud Run).

## Multi-Stage Production Build
- **Build Command**: `npm run build`
  - Runs `vite build` to compile the React SPA into `/dist`.
  - Runs `esbuild server.ts --bundle --platform=node --format=cjs --packages=external --sourcemap --outfile=dist/server.cjs`.
- **Start Command**: `npm start` -> `node dist/server.cjs`.

## Health Check
- `GET /healthz` -> Returns `200 OK` with JSON status.

## Environment Variables (`.env.example`)
```env
PORT=8080
NODE_ENV=production
RESEND_API_KEY=re_...
SUPABASE_URL=https://...supabase.co
SUPABASE_SERVICE_ROLE_KEY=ey...
FAST2SMS_API_KEY=...
```
