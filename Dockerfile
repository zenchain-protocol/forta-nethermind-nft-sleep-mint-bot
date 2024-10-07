# Build stage: compile Typescript to Javascript
FROM node:20-alpine AS builder
WORKDIR /app
COPY . .
RUN npm ci

# Define build-time arguments
ARG CHAIN_ID
ARG EVM_RPC
ARG STORAGE_API_URL
ARG NODE_ENV

# Set environment variables in the container
ENV CHAIN_ID=$CHAIN_ID
ENV EVM_RPC=$EVM_RPC
ENV STORAGE_API_URL=$STORAGE_API_URL
ENV NODE_ENV=$NODE_ENV

RUN npm run build
# obfuscate compiled Javascript (optional)
# RUN npm install -g javascript-obfuscator
# RUN javascript-obfuscator ./dist --output ./obfuscated --split-strings true --split-strings-chunk-length 3

# Final stage: copy compiled Javascript from previous stage and install production dependencies
FROM node:20-alpine
ENV NODE_ENV=production
LABEL "network.forta.settings.agent-logs.enable"="true"
WORKDIR /app
# if using obfuscated code:
# COPY --from=builder /app/obfuscated ./src
# else if using unobfuscated code:
COPY --from=builder /app/dist ./src
COPY package*.json ./
RUN npm ci --production
CMD [ "npm", "run", "start:prod" ]