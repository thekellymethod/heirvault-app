-- Baseline tables expected by HeirVault (Clerk + service-role DB access).
-- Apply: Supabase Dashboard → SQL Editor (paste & run), or `supabase db push` when linked.
-- Fixes PostgREST PGRST205: Could not find the table 'public.organizations'.

CREATE TABLE public.users (
  id uuid PRIMARY KEY,
  "clerkId" text NOT NULL UNIQUE,
  email text NOT NULL,
  roles text[] NOT NULL DEFAULT ARRAY[]::text[],
  first_name text,
  last_name text,
  bar_number text,
  role text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_users_email_lower ON public.users (lower(email));

CREATE TABLE public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  address_line1 text,
  address_line2 text,
  city text,
  state text,
  postal_code text,
  country text,
  phone text,
  logo_url text,
  owner_user_id text,
  billing_plan text,
  billing_status text,
  stripe_customer_id text,
  stripe_subscription_id text,
  stripe_subscription_status text,
  stripe_current_period_end timestamptz,
  stripe_has_payment_method boolean,
  included_active_registries integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.org_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  role text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, organization_id)
);

CREATE INDEX idx_org_members_user_id ON public.org_members (user_id);
CREATE INDEX idx_org_members_organization_id ON public.org_members (organization_id);

-- RLS off by default: server uses service_role (bypasses RLS). Enable + policies when using user JWT against these tables.
