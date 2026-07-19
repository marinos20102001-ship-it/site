# Multi-stage build: React app → nginx static server
FROM node:20-alpine AS build

WORKDIR /build

# Install deps
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

# Copy source
COPY . .

# Build-time env: backend URL (baked into the bundle)
ARG REACT_APP_BACKEND_URL
ENV REACT_APP_BACKEND_URL=$REACT_APP_BACKEND_URL

# Increase memory for CRA build
ENV NODE_OPTIONS=--max_old_space_size=2048

RUN yarn build

# ------- Production stage -------
FROM nginx:1.27-alpine

# Nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Static site from build stage
COPY --from=build /build/build /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
