.PHONY: install dev build preview typecheck deploy dry-run clean

install: ## Install dependencies
	npm install

dev: ## Run Vite + Worker locally (SPA + Durable Object)
	npm run dev

build: ## Type-check and build the SPA + Worker bundle
	npm run build

preview: build ## Preview the built app locally
	npm run preview

typecheck: ## Type-check only, no build
	npm run typecheck

deploy: build ## Build and deploy to Cloudflare Workers
	npx wrangler deploy

dry-run: build ## Validate the deploy without publishing
	npx wrangler deploy --dry-run

clean: ## Remove build output and caches
	rm -rf dist .wrangler *.tsbuildinfo
