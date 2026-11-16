# Build the LUNOR fork, not upstream Piik's published image.
FROM node:24-bookworm-slim AS web
WORKDIR /src
COPY . .
RUN npm ci --no-audit --no-fund && npm run build:web

FROM golang:1.26.6-bookworm AS server
WORKDIR /src
COPY . .
COPY --from=web /src/internal/server/webassets/dist/ ./internal/server/webassets/dist/
RUN CGO_ENABLED=0 go build -p 1 -trimpath -ldflags="-s -w" \
    -o /out/piik-server ./cmd/piik-server

FROM gcr.io/distroless/static-debian13:nonroot@sha256:e2e927ec666bae08560abb3c55d0659eceabb657f56b6782ab500a9fc7f555e3
WORKDIR /app
COPY --from=server --chmod=0555 /out/piik-server /app/piik-server
COPY --from=web --chmod=0444 /src/LICENSE /app/LICENSE
COPY --from=web --chmod=0444 /src/public/third-party-licenses.txt /app/THIRD-PARTY-NOTICES.txt
ENV PIIK_ENV=production \
    LISTEN_HOST=0.0.0.0 \
    ROOM_DATABASE_PATH=/home/nonroot/rooms.sqlite
USER 65532:65532
EXPOSE 8787/tcp 3478/udp 7882/udp
ENTRYPOINT ["/app/piik-server"]
