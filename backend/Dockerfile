FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install build tools required for native modules (sqlite3)
RUN apk add --no-cache python3 make g++

# Copy dependency files
COPY package*.json ./

# Install dependencies (including SQLite compilation files if needed)
RUN npm ci --only=production

# Remove build tools to keep image small
RUN apk del python3 make g++

# Copy source code
COPY . .

# Create uploads directory
RUN mkdir -p /app/uploads

# Expose port
EXPOSE 5000

# Start server
CMD ["npm", "start"]
