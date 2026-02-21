# Stage 1: Build the Next.js frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend

# Install dependencies only when needed
RUN apk add --no-cache libc6-compat
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci

COPY frontend/ ./
# Set commit hash for the build if needed by next.config.ts
# Using a dummy or actual hash; Next.js next.config.ts uses git, but .git is ignored.
# Let's provide a dummy commit hash to prevent errors.
ENV NEXT_PUBLIC_COMMIT_HASH="docker-build"
RUN npm run build

# Stage 2: Final runner environment (Python + Node.js)
FROM ghcr.io/13miles/whiteboard-4-git:latest AS runner

# Explicitly set user to root since the base image runs as 'worker' by default
USER root

# Install Python 3, pip, Node.js 20, and OpenSSH server
# Ubuntu 24.04 uses PEP 668, so we create a virtual environment for Python packages
RUN apt-get update && \
    apt-get install -y python3 python3-pip python3-venv curl openssh-server sudo \
    dnsutils iputils-ping traceroute && \
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Allow SSH password authentication and set worker password
RUN echo 'worker:sunsp4750' | chpasswd && \
    sed -i 's/^#*PasswordAuthentication.*/PasswordAuthentication yes/' /etc/ssh/sshd_config && \
    sed -i 's/^#*PermitRootLogin.*/PermitRootLogin yes/' /etc/ssh/sshd_config

WORKDIR /app

# Set up Python virtual environment
RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Set up Backend
COPY backend/requirements.txt ./backend/
RUN pip install --no-cache-dir -r ./backend/requirements.txt

COPY backend/ ./backend/

# Set up Frontend (Standalone Next.js)
COPY --from=frontend-builder /app/frontend/public ./frontend/public
COPY --from=frontend-builder /app/frontend/.next/standalone ./frontend/
COPY --from=frontend-builder /app/frontend/.next/static ./frontend/.next/static

# Copy the start script
COPY start.sh ./
RUN chmod +x start.sh

# Expose ports for Next.js and FastAPI
EXPOSE 3000
EXPOSE 8000
EXPOSE 443

ENV PORT=3000
ENV NODE_ENV=production
ENV TERM=xterm-256color

RUN chown -R worker:worker /app /opt/venv

USER worker

CMD ["./start.sh"]
