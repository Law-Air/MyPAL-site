-- Template applied identically inside every site's own schema by the
-- provisioning script (:schema_name is substituted at provisioning time).
-- "Arhitectură identică, diferă doar datele."

CREATE TABLE :schema_name.family_members (
    id                  SERIAL PRIMARY KEY,
    first_name          TEXT        NOT NULL,
    birth_date          DATE,
    pin_hash            TEXT,                          -- 4-digit PIN, bcrypt hash
    is_titular          BOOLEAN     NOT NULL DEFAULT false,
    can_set_custom_pin  BOOLEAN     NOT NULL DEFAULT true,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seeded per domain; 10-20 categories per major activity (exact list TBD
-- with Safix/Mircea — this structure supports adding/renaming categories
-- without a schema change).
CREATE TABLE :schema_name.categories (
    id          SERIAL PRIMARY KEY,
    code        TEXT NOT NULL,   -- referinta stabila folosita in ecosistem, ex. 'V01', 'C05', 'J03', 'A02'
    domain      TEXT NOT NULL CHECK (domain IN ('conta','juridic','rezervari_simulari','audit')),
    name        TEXT NOT NULL,
    sort_order  INT  NOT NULL DEFAULT 0,
    UNIQUE (code)
);

CREATE TABLE :schema_name.records (
    id                  BIGSERIAL PRIMARY KEY,
    category_id         INT         NOT NULL REFERENCES :schema_name.categories(id),
    created_by_member_id INT        REFERENCES :schema_name.family_members(id),
    title               TEXT,
    content             JSONB       NOT NULL DEFAULT '{}',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE :schema_name.clone_replacement_requests (
    id              SERIAL PRIMARY KEY,
    role_category   TEXT NOT NULL CHECK (role_category IN ('conta','juridic','rezervari_simulari','audit')),
    requested_by_member_id INT REFERENCES :schema_name.family_members(id),
    reason          TEXT,
    status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','done','rejected')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_records_category ON :schema_name.records(category_id);
