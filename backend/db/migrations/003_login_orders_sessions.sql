-- Suport pentru login real (email + parolă), comenzi/plăți și sesiuni
-- persistente de familie. Se aplică o singură dată peste core schema,
-- sigur de rulat din nou (idempotent).

ALTER TABLE core.sites
    ADD COLUMN IF NOT EXISTS allocated_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS password_is_default BOOLEAN NOT NULL DEFAULT true;

-- O familie poate avea mai multe adrese de email (al doilea email, adăugat
-- ulterior). Login-ul caută întotdeauna după email, nu după site_number.
CREATE TABLE IF NOT EXISTS core.site_emails (
    id          BIGSERIAL PRIMARY KEY,
    site_id     BIGINT      NOT NULL REFERENCES core.sites(id),
    email       TEXT        NOT NULL UNIQUE,
    is_primary  BOOLEAN     NOT NULL DEFAULT false,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_site_emails_site ON core.site_emails(site_id);

-- Comandă publică (Nume+Email+Plan), înainte de confirmarea plății. Site-ul
-- e alocat abia la confirmare (core.orders.site_id rămâne NULL până
-- atunci) — plata confirmă alocarea, nu invers.
CREATE TABLE IF NOT EXISTS core.orders (
    id                 BIGSERIAL PRIMARY KEY,
    family_name        TEXT        NOT NULL,
    email              TEXT        NOT NULL,
    subscription_plan  TEXT        NOT NULL DEFAULT 'start'
                                    CHECK (subscription_plan IN ('start','standard','premium')),
    status             TEXT        NOT NULL DEFAULT 'pending'
                                    CHECK (status IN ('pending','confirmed','cancelled')),
    site_id            BIGINT      REFERENCES core.sites(id),
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    confirmed_at       TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_orders_status ON core.orders(status);

-- Sesiune de familie: persistentă (fără expirare automată — "asta e casa
-- lor"), invalidată explicit doar la delogare confirmată cu parola
-- familiei. Token-ul brut se trimite o singură dată clientului (cookie);
-- aici se stochează doar hash-ul lui, ca să nu existe niciun secret viu
-- de recuperat direct din baza de date.
CREATE TABLE IF NOT EXISTS core.sessions (
    id          BIGSERIAL PRIMARY KEY,
    site_id     BIGINT      NOT NULL REFERENCES core.sites(id),
    token_hash  TEXT        NOT NULL UNIQUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    revoked_at  TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_sessions_site ON core.sessions(site_id);
