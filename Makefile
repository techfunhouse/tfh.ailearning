# Cross-platform Makefile for RefHub
# Use this to run common tasks without dealing with npm scripts directly

# Default task
.PHONY: help
help:
	@echo "RefHub Development Commands"
	@echo "--------------------------"
	@echo "install     - Install all dependencies"
	@echo "dev         - Run both client and server"
	@echo "client      - Run client only"
	@echo "server      - Run server only"
	@echo "build       - Build client and server"
	@echo "start       - Start production server"
	@echo "clean       - Remove build artifacts"

# Install dependencies
.PHONY: install
install:
	npm install
	cd client && npm install
	cd server && npm install

# Development tasks
.PHONY: dev
dev:
	npx concurrently "make server" "make client"

.PHONY: client
client:
	cd client && npm run dev

.PHONY: server
server:
	cd server && npm run dev

# Build tasks
.PHONY: build
build: 
	cd client && npm run build
	cd server && npm run build

# Start production
.PHONY: start
start:
	cd server && npm run start

# Clean build artifacts
.PHONY: clean
clean:
	rm -rf dist
	rm -rf client/dist
	rm -rf server/dist