# GraphQL Practice Workspace

This monorepo is a hands-on playground for building and experimenting with GraphQL APIs, authentication, Prisma, and a React/Vite frontend. It combines a Prisma-backed Apollo server, a supporting Express API artifact, and shared tooling for generated clients and schema helpers.

## What’s included

- A GraphQL server in graphql-server/ with Apollo Server, Prisma, JWT authentication, subscriptions, Zod validation, and structured error handling
- A Vite + React frontend in artifacts/web/ for interacting with the UI
- An Express-based API artifact in artifacts/api-server/ for supporting services and experimentation
- Shared packages in lib/, db/, and scripts/ for clients, database schema, and helper utilities

## Prerequisites

- Node.js 20+
- pnpm
- PostgreSQL (required for the Prisma-backed GraphQL server)

## Getting started

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Create a local environment file for the GraphQL server:

   ```bash
   cp graphql-server/.env.example graphql-server/.env
   ```

   Make sure the file includes at least:

   - JWT_SECRET
   - DATABASE_URL

3. Start the GraphQL server:

   ```bash
   cd graphql-server
   pnpm start
   ```

   The server will be available at:
   - http://localhost:5000/graphql
   - ws://localhost:5000/graphql

4. Start the frontend:

   ```bash
   pnpm --filter @workspace/web run dev
   ```

5. Start the API artifact server:

   ```bash
   pnpm --filter @workspace/api-server run dev
   ```

## Useful commands

From the repository root:

- pnpm run build — build the workspace packages
- pnpm run typecheck — run workspace type checks
- pnpm run typecheck:libs — check shared library packages

From the GraphQL server package:

- pnpm start — start the Apollo server
- pnpm seed — seed the Prisma database

## Current GraphQL capabilities

The server currently supports:

- Queries for books, movies, the current time, and search results
- Mutations for creating, updating, and deleting books
- User registration and login with JWT-based authentication
- Subscriptions for new book events
- Input validation and production-friendly GraphQL error handling

## Project structure

- graphql-server/ — Apollo GraphQL server, schema, resolvers, auth helpers, Prisma configuration, and websocket setup
- artifacts/api-server/ — standalone Express API artifact
- artifacts/web/ — Vite + React frontend
- artifacts/mockup-sandbox/ — UI mockup sandbox for experimentation
- lib/ — shared libraries and generated client code
- db/ — Drizzle-based database package and schema definitions
- scripts/ — repository helper scripts

## Contributing

Feel free to extend the workspace by adding new resolvers, UI pages, database models, or API endpoints. Keep changes scoped to the relevant package and update this README when introducing new workflows.
