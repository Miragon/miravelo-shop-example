# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY services/shop/shop-frontend/package.json services/shop/shop-frontend/package-lock.json ./

# Install dependencies
RUN npm ci

# Copy only build-relevant sources
COPY services/shop/shop-frontend/src ./src
COPY services/shop/shop-frontend/public ./public
COPY services/shop/shop-frontend/index.html ./
COPY services/shop/shop-frontend/vite.config.ts ./
COPY services/shop/shop-frontend/tsconfig.json ./
COPY services/shop/shop-frontend/eslint.config.js ./
COPY services/shop/shop-frontend/openapitools.json ./

# Build the application
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom nginx configuration
COPY services/shop/shop-frontend/nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 8080
EXPOSE 8080

# Start nginx
CMD ["nginx", "-g", "daemon off;"]