-- Core schema: shared infrastructure for one major project (MyPAL OR Fin-Air).
-- Each major project gets its own Postgres instance (per Admin decision),
-- so this schema never needs a "project" column — it always describes
-- exactly one project's sites.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE SCHEMA IF NOT EXISTS core;

-- One row per microsite (family). Never holds business data — only
-- routing/identity information needed to authenticate and reach the
-- site's own isolated schema.
CREATE TABLE core.sites (
    id                     BIGSERIAL PRIMARY KEY,
    site_number            TEXT        NOT NULL UNIQUE,  -- external format, e.g. '1/000.047'
    site_number_seq        BIGINT      NOT NULL UNIQUE,  -- normalized: group*1000000 + block*1000 + seq
    schema_name            TEXT        NOT NULL UNIQUE,  -- e.g. 'site_1_000047'
    db_role_name           TEXT        NOT NULL UNIQUE,  -- dedicated Postgres login role for this site
    db_role_password_enc   BYTEA       NOT NULL,          -- pgcrypto-encrypted, app decrypts with master key
    family_name            TEXT,
    subscription_plan      TEXT        NOT NULL DEFAULT 'start'
                                        CHECK (subscription_plan IN ('start','standard','premium')),
    status                 TEXT        NOT NULL DEFAULT 'active'
                                        CHECK (status IN ('active','suspended','destroyed')),
    access_password_hash   TEXT,       -- bcrypt hash of the site-wide login password
                                        -- (issued externally, family can change it after first login)
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    activated_at           TIMESTAMPTZ,
    destroyed_at           TIMESTAMPTZ
);

-- Sequence counter used to hand out the next site_number atomically.
-- One row, locked with FOR UPDATE when allocating the next number.
CREATE TABLE core.site_number_counter (
    id              SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    current_group   INT    NOT NULL DEFAULT 1,       -- 1..999
    current_seq     INT    NOT NULL DEFAULT 0         -- 0..999999 within the group
);
INSERT INTO core.site_number_counter (id, current_group, current_seq)
VALUES (1, 1, 0)
ON CONFLICT (id) DO NOTHING;

-- Evidence/audit table for advisor "clones" — Generation 0 (the initial
-- team) shares clone_id = site_number; replacements append -G1, -G2, ...
CREATE TABLE core.clones (
    id                    BIGSERIAL PRIMARY KEY,
    site_id               BIGINT      NOT NULL REFERENCES core.sites(id),
    clone_id              TEXT        NOT NULL,  -- e.g. '1/000.047' or '1/000.047-G1'
    role_category         TEXT        NOT NULL
                                       CHECK (role_category IN ('conta','juridic','rezervari_simulari','audit')),
    generation             INT         NOT NULL DEFAULT 0,
    mother_carrier_ref     TEXT,       -- lineage reference; can be updated as the chain extends
    status                 TEXT        NOT NULL DEFAULT 'activ'
                                        CHECK (status IN ('activ','suspendat','inlocuit')),
    ai_model_version       TEXT,
    replaced_by_clone_id   BIGINT      REFERENCES core.clones(id),
    replacement_reason     TEXT,
    activated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    deactivated_at          TIMESTAMPTZ,
    UNIQUE (site_id, role_category, generation)
);

CREATE INDEX idx_clones_site ON core.clones(site_id);
CREATE INDEX idx_sites_status ON core.sites(status);
