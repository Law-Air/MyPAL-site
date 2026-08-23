-- Template applied identically inside every site's own schema by the
-- provisioning script (:schema_name is substituted at provisioning time).
-- "Arhitectură identică, diferă doar datele."

CREATE TABLE :schema_name.family_members (
    id                  SERIAL PRIMARY KEY,
    first_name          TEXT        NOT NULL,
    birth_date          DATE,
    relation_label      TEXT,                          -- 'Tata','Mama','Copil mare', etc.
    member_code         TEXT,                          -- cod membru, in clar — separare de fluxuri
                                                         -- intre membri (prezentat liber Consilierului),
                                                         -- NU un mecanism de securitate reala
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

-- Copie de siguranta text (instructiuni/fisiere Consilieri), salvata si
-- recuperata exclusiv de familie, prin site — niciodata scrisa automat de
-- catre un Consilier, nici citita de Admin (decizie Mircea, 25 iulie 2026).
-- Append-only: nu exista UPDATE/DELETE expuse, doar INSERT + citire.
CREATE TABLE :schema_name.memorie_backup (
    id          BIGSERIAL PRIMARY KEY,
    eticheta    TEXT,
    continut    TEXT NOT NULL,
    creat_la    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Link-ul curent al fiecarui Consilier (self-service, editabil doar de
-- familie, prin Memorie parolata). Inlocuieste hardcodarea din HTML —
-- decizie Mircea, 16 august 2026: familia inlocuieste singura o Clona,
-- fara ca Echipa Tehnica sa mai aiba nevoie de acces temporar in Proiect.
CREATE TABLE :schema_name.consilieri_linkuri (
    rol           TEXT        PRIMARY KEY CHECK (rol IN ('advix','adviz','verix','vivix')),
    link_curent   TEXT        NOT NULL,
    revizie       INT         NOT NULL DEFAULT 1,
    actualizat_la TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Istoric append-only al link-urilor anterioare — singurul rol e sa
-- permita "Restaurează" daca familia aloca link-ul gresit unui Consilier
-- (nu si trasabilitatea firelor arhivate — acelea raman in claude.ai,
-- identificabile prin Titlu).
CREATE TABLE :schema_name.consilieri_linkuri_istoric (
    id              BIGSERIAL PRIMARY KEY,
    rol             TEXT        NOT NULL,
    link            TEXT        NOT NULL,
    revizie         INT         NOT NULL,
    inregistrat_la  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- NOTA: cererile de ajutor tehnic pentru inlocuire Clona folosesc tabelul
-- clone_replacement_requests deja definit mai sus (role_category pe
-- denumirile de domeniu: conta/juridic/audit/rezervari_simulari) —
-- backend-ul mapeaza numele de brand (advix/adviz/verix/vivix) la domeniu
-- inainte de INSERT, nu se creeaza alt tabel.
