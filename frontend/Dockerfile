FROM node:20-alpine

WORKDIR /app

# Install deps first (better layer caching)
COPY package*.json ./
RUN npm ci

# Copy the rest of the app
COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]
