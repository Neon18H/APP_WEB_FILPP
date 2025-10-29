# Use a lightweight Node.js image for production
FROM node:20-alpine

# Set working directory
WORKDIR /usr/src/app

# Install dependencies
COPY package.json ./
RUN npm install --omit=dev

# Copy application source
COPY src ./src

# Expose the default application port
EXPOSE 4000

# Run the service
CMD ["node", "src/index.js"]
