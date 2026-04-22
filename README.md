### Development

#### SST
```
npm run dev
```

#### Next.js web app:
```
cd packages/web
npm run dev
```

### Catalyst CLI
* `npm run quote -- FPC0631` - Get a quote for a bond

### Testing

See [docs/testing.md](docs/testing.md) for full details on our testing setup.

* **Unit Tests**: `npm run test`
* **Smoke Tests**: `npm run test:smoke` (requires `.env.local` to be setup, check docs for details).
* **Integration Smoke Tests**: `npm run test:smoke:int` (targets the `int` stage URL using Playwright).
