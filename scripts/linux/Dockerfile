# Keep glibc at 2.31 and WebKit2GTK at 4.0 for the existing Linux package.
FROM golang:1.25-bookworm AS go
FROM node:22-bullseye-slim
COPY --from=go /usr/local/go /usr/local/go
# The slim Node image has no CA bundle before apt installs ca-certificates.
COPY --from=go /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/ca-certificates.crt
ENV PATH="/usr/local/go/bin:/go/bin:${PATH}" GOPATH=/go GOTOOLCHAIN=local
# Bullseye security packages moved to the archive after LTS ended.
# Only the archived index expiry is ignored; package signatures stay enabled.
RUN rm -f /etc/apt/sources.list.d/*.list /etc/apt/sources.list.d/*.sources \
    && printf '%s\n' \
       'deb https://deb.debian.org/debian bullseye main' \
       'deb [check-valid-until=no] https://archive.debian.org/debian-security bullseye-security main' \
       > /etc/apt/sources.list \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get -o Acquire::Retries=3 update \
    && apt-get -o Acquire::Retries=3 install -y --no-install-recommends \
       ca-certificates build-essential pkg-config libgtk-3-dev \
       libwebkit2gtk-4.0-dev binutils git \
    && rm -rf /var/lib/apt/lists/*
RUN go install github.com/wailsapp/wails/v2/cmd/wails@v2.10.1 \
    && go clean -modcache -cache
WORKDIR /work
