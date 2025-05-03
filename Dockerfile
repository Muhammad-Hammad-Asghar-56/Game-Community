# Use an official Node.js runtime
FROM node:18-alpine

# Set working directory
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the app
COPY . .

# Expose the port your app runs on (e.g., 3000)
EXPOSE 3000

# Start the app (nodemon for dev, node for prod)
CMD ["npm", "start"]