# Docker Security & Build Optimization

**Estado del documento:** 📌 VIGENTE (documento de referencia continuo) — Guía vigente de seguridad de Docker.


## Overview

When building container images for BCP (or any service), follow these security practices to prevent supply chain attacks and reduce attack surface.

**Alignment:** Anthropic Glasswing recommendation: Harden the pipeline against tampering.

---

## Dockerfile Best Practices

### 1. Use Official Base Images

```dockerfile
# ✅ GOOD: Official Node image, specific version
FROM node:20.15-alpine AS builder

# ❌ WRONG: Latest (unpredictable)
FROM node:latest

# ❌ WRONG: Unofficial image
FROM ubuntu:latest
```

### 2. Minimize Image Layers

```dockerfile
# ❌ WRONG: Multiple RUN creates layers (bloat)
RUN apt-get update
RUN apt-get install -y package1
RUN apt-get install -y package2
RUN rm -rf /var/lib/apt/lists/*

# ✅ GOOD: Single RUN, clean up in same layer
RUN apt-get update && \
    apt-get install -y package1 package2 && \
    rm -rf /var/lib/apt/lists/*
```

### 3. Multi-Stage Builds (Reduce Final Size)

```dockerfile
# Builder stage (with dev dependencies)
FROM node:20-alpine AS builder
WORKDIR /build
COPY pnpm-lock.yaml .
COPY package.json .
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

# Runtime stage (production only)
FROM node:20-alpine
WORKDIR /app
COPY --from=builder /build/dist ./dist
COPY --from=builder /build/node_modules ./node_modules
RUN npm prune --production  # Remove dev dependencies
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

### 4. Non-Root User

```dockerfile
# Create unprivileged user
RUN addgroup -S appuser && adduser -S appuser -G appuser
USER appuser

# Never run as root in container
# ❌ WRONG:
# USER root
# RUN apt-get update
# USER appuser
```

### 5. Health Check

```dockerfile
HEALTHCHECK --interval=10s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"
```

### 6. Scan for Secrets

```dockerfile
# Before building, ensure no secrets in codebase
# This fails if .env, API keys, or passwords found
RUN grep -r "secret\|password\|api.key" . && exit 1 || echo "No secrets found"
```

---

## Docker Build Pipeline (GitHub Actions)

### Multi-Architecture Builds with BuildKit

```yaml
name: Docker Build & Push

on:
  push:
    branches: [main]
    tags: ["v*"]
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write

    steps:
      - uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3
        with:
          driver-options: image=moby/buildkit:latest

      - name: Log in to GitHub Container Registry
        if: github.event_name != 'pull_request'
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: |
            ghcr.io/${{ github.repository }}
          tags: |
            type=ref,event=branch
            type=semver,pattern={{version}}
            type=semver,pattern={{major}}.{{minor}}
            type=sha

      - name: Build Docker image (amd64, arm64)
        uses: docker/build-push-action@v5
        with:
          context: .
          platforms: linux/amd64,linux/arm64
          push: ${{ github.event_name != 'pull_request' }}
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
          build-args: |
            BUILDKIT_INLINE_CACHE=1

      - name: SBOM Generation (Syft)
        if: github.event_name != 'pull_request'
        run: |
          curl -sSfL https://raw.githubusercontent.com/anchore/syft/main/install.sh | sh -s -- -b /usr/local/bin
          syft ghcr.io/${{ github.repository }}:${{ github.sha }} -o spdx > /tmp/sbom.spdx.json
          echo "SBOM generated for container image"

      - name: Scan Image with Grype
        uses: anchore/scan-action@v3
        id: scan
        with:
          image: ghcr.io/${{ github.repository }}:${{ github.sha }}
          fail-build: false
          severity-cutoff: high

      - name: Upload Scan Results
        uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: ${{ steps.scan.outputs.sarif }}
```

### Layer Caching Strategy

```yaml
- name: Build with Docker Buildx (optimized caching)
  uses: docker/build-push-action@v5
  with:
    context: .
    cache-from: type=gha
    cache-to: type=gha,mode=max
    # Cache key: OS → dependencies → source
    # Change only when deps change, not source
```

This caches:
1. Base image (alpine, node)
2. Dependency installation (pnpm install)
3. Application build (pnpm build)
4. Final runtime layer

Rebuild only changed layers → **3-5x faster builds**.

---

## Artifact Signing & Attestation

### 1. Sign Container Image (Cosign)

```bash
# Install cosign
curl https://raw.githubusercontent.com/sigstore/cosign/main/install.sh | sh

# Sign image pushed to registry
cosign sign --key cosign.key ghcr.io/owner/repo:latest
# Creates signature in separate OCI artifact

# Verify signature before pulling
cosign verify --key cosign.pub ghcr.io/owner/repo:latest
```

### 2. Verify Provenance (SLSA)

```bash
# Generate provenance statement (what sources went into build)
slsa-provenance-action

# Upload to OCI registry
oras push ghcr.io/owner/repo:latest-sbom \
  sbom.spdx.json:application/spdx+json
```

### 3. GitHub Actions Attestation

```yaml
- name: Generate Attestation
  uses: actions/attest-build-provenance@v1
  with:
    subject-path: 'dist/**'
    # Creates signed statement proving:
    # - Source commit hash
    # - Build workflow URL
    # - Timestamp
    # - Signer (GitHub)
```

Verification:
```bash
gh attestation verify dist/index.js --repo owner/repo
# Validates: only GitHub Actions signed this build
```

---

## Vulnerability Scanning

### Grype (Container Image Scanning)

```yaml
- name: Scan image for vulnerabilities
  run: |
    curl -sSfL https://raw.githubusercontent.com/anchore/grype/main/install.sh | sh -s -- -b /usr/local/bin
    grype ghcr.io/owner/repo:latest \
      --fail-on high \
      --output json > scan-results.json
    # Fails if HIGH or CRITICAL CVEs found in image
```

### Trivy (Fast & Accurate)

```yaml
- name: Scan with Trivy
  uses: aquasecurity/trivy-action@master
  with:
    image-ref: ghcr.io/${{ github.repository }}:${{ github.sha }}
    format: 'sarif'
    output: 'trivy-results.sarif'

- name: Upload Trivy results to GitHub Security
  uses: github/codeql-action/upload-sarif@v3
  with:
    sarif_file: 'trivy-results.sarif'
```

---

## Security Checklist for Dockerfile

- [ ] Base image from official source (Docker Hub official registry)
- [ ] Base image version pinned (not `latest`)
- [ ] No secrets in Dockerfile (API keys, tokens, passwords)
- [ ] Non-root user for running application
- [ ] Multi-stage build (dev dependencies removed)
- [ ] Only necessary files copied (`COPY --chown=appuser:appuser`)
- [ ] Health check defined
- [ ] Read-only filesystem where possible (`RUN --mount=type=tmpfs`)
- [ ] No `RUN apt-get install` without cleanup
- [ ] Layers minimize bloat (single RUN for related operations)
- [ ] Scan results pass (Grype/Trivy, no HIGH+ CVEs)
- [ ] Provenance signed & verified (Cosign)

---

## Example Production Dockerfile

```dockerfile
# syntax=docker/dockerfile:1
FROM node:20.15-alpine AS builder

WORKDIR /build

# Install dependencies
COPY pnpm-lock.yaml package.json ./
RUN apk add --no-cache python3 make g++ && \
    pnpm install --frozen-lockfile && \
    apk del python3 make g++

# Copy source and build
COPY . .
RUN pnpm build && \
    pnpm prune --production

# ============================================================
# Runtime stage
# ============================================================
FROM node:20.15-alpine

WORKDIR /app

# Security: non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy built application
COPY --from=builder --chown=appuser:appgroup /build/dist ./dist
COPY --from=builder --chown=appuser:appgroup /build/node_modules ./node_modules
COPY --from=builder --chown=appuser:appgroup /build/package.json ./package.json

# No root
USER appuser

# Health check
HEALTHCHECK --interval=10s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

EXPOSE 3000

CMD ["node", "dist/index.js"]
```

---

## Deployment Security

### Never Mutate Containers in Production

```bash
# ❌ WRONG: SSH into container to fix things
docker exec -it container-id bash

# ✅ CORRECT: Rebuild & redeploy with fix
git commit -m "fix: issue"
git push origin main
# CI builds new image → deploys → old container stops
```

### Secrets Injection

```yaml
# ❌ WRONG: Secrets in environment variables
env:
  DATABASE_PASSWORD: ${{ secrets.DB_PASSWORD }}
  # Visible in `docker inspect`, logs, process listing

# ✅ CORRECT: Use Docker secrets (Swarm) or sealed secrets (K8s)
# Mounted as files, never in environment
docker secret create db_password -
```

### Least Privilege Network

```dockerfile
# Expose only what's necessary
EXPOSE 3000
# Don't expose admin ports, debug ports, etc.

# In Kubernetes:
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: bcp-api
spec:
  podSelector:
    matchLabels:
      app: bcp-api
  policyTypes:
    - Ingress
    - Egress
  ingress:
    - from:
        - podSelector:
            matchLabels:
              app: bcp-web
      ports:
        - protocol: TCP
          port: 3000
```

---

## References

- [Docker Security Best Practices](https://docs.docker.com/engine/security/)
- [OWASP Container Security Top 10](https://cheatsheetseries.owasp.org/cheatsheets/Docker_Security_Cheat_Sheet.html)
- [Cosign: Container Signing](https://docs.sigstore.dev/cosign/overview/)
- [SLSA Provenance](https://slsa.dev/)
- [Grype: Vulnerability Scanner](https://github.com/anchore/grype)

---

*Last updated: 2026-07-15*  
*Next review: 2026-10-15*
