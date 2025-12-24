# Supabase Setup Guide for Restaurant Pre-Order Tracker

This guide will help you connect your Restaurant Pre-Order Tracker to a Supabase PostgreSQL database.

## Prerequisites

- A Supabase account (free at [supabase.com](https://supabase.com))
- Node.js 18+ installed

## Step 1: Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click "New Project"
3. Fill in:
   - **Name**: `restaurant-pre-order-tracker` (or your preferred name)
   - **Database Password**: Generate a strong password (save this!)
   - **Region**: Choose the closest to your location
4. Click "Create new project" and wait for setup (~2 minutes)

## Step 2: Run the SQL Migration Scripts

1. In your Supabase Dashboard, go to **SQL Editor** (left sidebar)
2. Click **New Query**
3. Copy and paste the contents of `supabase/migrations/001_create_orders_tables.sql`
4. Click **Run** (or press Ctrl/Cmd + Enter)
5. Create another new query
6. Copy and paste the contents of `supabase/migrations/002_views_and_functions.sql`
7. Click **Run**

You should see success messages. The tables `orders` and `order_items` are now created with sample data.

## Step 3: Get Your API Keys

1. Go to **Project Settings** (gear icon in sidebar)
2. Click **API** in the left menu
3. You'll see:
   - **Project URL**: Something like `https://abcdefgh.supabase.co`
   - **anon/public key**: A long string starting with `eyJ...`
   - **service_role key**: Another long string (keep this secret!)

## Step 4: Configure Environment Variables

1. Create a `.env.local` file in your project root:

```bash
# Copy from env.example.txt and fill in your values
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

2. Replace the placeholder values with your actual Supabase credentials

⚠️ **Important**: Never commit `.env.local` to version control!

## Step 5: Start the Application

```bash
pnpm dev
```

Your app is now connected to Supabase! 🎉

---

## Database Schema Overview

### Tables

#### `orders`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| order_number | VARCHAR(10) | Display ID (e.g., #1234) |
| customer_name | VARCHAR(255) | Customer's name |
| status | ENUM | 'pending', 'arrived', 'delivered' |
| estimated_arrival | VARCHAR(50) | Estimated arrival time |
| arrived_at | TIMESTAMPTZ | When customer arrived |
| wait_time | INTEGER | Wait time in seconds |
| delivery_type | ENUM | 'on-site', 'delivery' |
| address | TEXT | Delivery address (if applicable) |
| created_at | TIMESTAMPTZ | Creation timestamp |
| updated_at | TIMESTAMPTZ | Last update timestamp |

#### `order_items`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| order_id | UUID | Foreign key to orders |
| name | VARCHAR(255) | Item name |
| quantity | INTEGER | Quantity ordered |
| created_at | TIMESTAMPTZ | Creation timestamp |

---

## API Endpoints

The app includes the following API routes:

### Orders

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/orders` | Get all orders with items |
| POST | `/api/orders` | Create a new order |
| GET | `/api/orders/[id]` | Get a specific order |
| PATCH | `/api/orders/[id]` | Update an order |
| DELETE | `/api/orders/[id]` | Delete an order |
| POST | `/api/orders/[id]/arrived` | Mark order as arrived |
| POST | `/api/orders/[id]/delivered` | Mark order as delivered |

### Other

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/products` | Get aggregated product quantities |
| GET | `/api/stats` | Get order statistics |

---

## Troubleshooting

### "Missing Supabase environment variables"
- Make sure `.env.local` exists and contains all required variables
- Restart the dev server after creating/modifying `.env.local`

### "Failed to fetch orders"
- Check your Supabase project is active
- Verify your API keys are correct
- Check the Supabase logs in your dashboard

### Row Level Security (RLS) Issues
The migration scripts enable anonymous access for development. For production:
1. Set up proper authentication
2. Update RLS policies to restrict access to authenticated users
3. Remove the anonymous access policies

---

## Production Considerations

1. **Authentication**: Implement user authentication with Supabase Auth
2. **RLS Policies**: Tighten Row Level Security policies
3. **API Keys**: Use environment variables on your hosting platform
4. **Service Role Key**: Only use on the server, never expose to clients

