# Discord Ticket Bot

TypeScript Discord ticket bot backed by Supabase/PostgreSQL. It supports:

- `/ticket create`
- a persistent support-panel style `Create Ticket` button
- automatic staff assignment to the least-loaded active staff member
- claim and close actions
- ticket message sync into Supabase

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy the environment template and fill in your Discord and Supabase values:

   ```bash
   cp .env.example .env
   ```

3. Apply the database schema in [`supabase/schema.sql`](/Users/shunakiyama/Desktop/discord-bot/supabase/schema.sql).

4. Register slash commands for your guild:

   ```bash
   npm run register-commands
   ```

5. Start the bot in development mode:

   ```bash
   npm run dev
   ```

## Discord Requirements

- Enable the bot in your target server and grant it channel management permissions.
- Enable the `Server Members Intent` and `Message Content Intent` in the Discord developer portal.
- `STAFF_ROLE_ID` controls staff-only actions and ticket-channel visibility.
- If `SUPPORT_CHANNEL_ID` is set, the bot will ensure a panel message with a `Create Ticket` button exists there on startup.

## Database Notes

- `tickets` enforces one active ticket per user with a partial unique index.
- `staff_members` stores the pool for automatic assignment.
- `ticket_messages` stores synced Discord messages and attachment metadata.
- `ticket_events` acts as an audit trail for lifecycle actions.
