# Stage 1: Build the app
FROM node:22-alpine AS build-stage

WORKDIR /app

# Copy package files first
COPY package*.json ./

# Install ALL dependencies
RUN npm ci

# Stage 2: Serve with Nginx
FROM node:22-alpine

WORKDIR /app

ENV NODE_ENV=production

# 1. Create a non-root user and group
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# 2. Copy the dependencies from the builder stage
COPY --from=build-stage /app/node_modules ./node_modules
COPY . .

# 3. Grant ownership of the application directory to the new user
RUN chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

EXPOSE 8081

CMD ["npm", "start"]
