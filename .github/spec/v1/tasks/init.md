# Offchain Backend Initialization

## Task 1: Set up Node.js/TypeScript backend
- Initialize project with `npm init -y`
- Install dependencies: `express`, `gill`, `kysely`, `pg`, `@helius-labs/helius-sdk`
- Create Express server with endpoints for fetching user investments and fundraiser stats

## Task 2: Configure PostgreSQL database
- Set up schema with tables: `users`, `investments` (fields: id, user_pubkey, fundraiser_pubkey, pda_address, counter, amount, reit_amount, released, investment_date)
- Use Kysely for type-safe SQL queries (define table interfaces in TypeScript)
- For migrations, use a tool like `db-migrate` or run manual SQL scripts (e.g., via `pg` client)
- Run locally with Docker: `docker run -e POSTGRES_PASSWORD=password -p 5432:5432 postgres:15`