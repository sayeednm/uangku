-- =====================================================
-- UANGKU DATABASE MIGRATION - NOTES MODULE (CATATAN)
-- =====================================================
-- Adds the "Catatan" (Notes) module:
--
-- Tables:
-- 1. notes              - User notes (general or financial)
-- 2. checklist_items    - Checklist entries belonging to a note
-- 3. tags               - Per-user tag names
-- 4. note_tags          - Many-to-many notes <-> tags
-- 5. note_transactions  - Many-to-many notes <-> transactions (optional link)
--
-- Conventions follow the initial schema:
-- - UUID primary keys via gen_random_uuid()
-- - TIMESTAMPTZ for timestamps
-- - BIGINT for money (smallest currency unit) — no floats
-- - Lowercase enum values (consistent with 'income'/'expense'/'cash')
-- - RLS enabled on every table, strict per-user isolation
-- - Soft delete via deleted_at (trash); hard delete only from trash
-- =====================================================

-- =====================================================
-- ENUM TYPES
-- =====================================================

-- Note categories. GENERAL notes have no financial fields.
-- Financial types may carry amount / due_date / financial_status.
CREATE TYPE note_type AS ENUM ('general', 'hutang', 'piutang', 'tagihan', 'keuangan');

CREATE TYPE note_financial_status AS ENUM ('pending', 'paid', 'cancelled');

-- =====================================================
-- TABLE: notes
-- =====================================================

CREATE TABLE notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title VARCHAR(200),
    content TEXT,
    note_type note_type NOT NULL DEFAULT 'general',
    amount BIGINT,
    due_date DATE,
    financial_status note_financial_status,
    is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
    is_archived BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT notes_title_length CHECK (title IS NULL OR CHAR_LENGTH(title) <= 200),
    CONSTRAINT notes_content_length CHECK (content IS NULL OR CHAR_LENGTH(content) <= 20000),
    CONSTRAINT notes_amount_positive CHECK (amount IS NULL OR amount > 0),
    -- Content or title must be present so an empty note is never stored
    CONSTRAINT notes_not_empty CHECK (
        (title IS NOT NULL AND TRIM(title) <> '')
        OR (content IS NOT NULL AND TRIM(content) <> '')
    ),
    -- Financial fields only make sense on financial note types
    CONSTRAINT notes_financial_fields_check CHECK (
        (
            note_type <> 'general'
            AND (amount IS NULL OR amount > 0)
        )
        OR (
            note_type = 'general'
            AND amount IS NULL
            AND due_date IS NULL
            AND financial_status IS NULL
        )
    )
);

-- Indexes (list queries: filter by user, not trashed, not archived,
-- sort by pinned then updated)
CREATE INDEX idx_notes_user_id ON notes(user_id);
CREATE INDEX idx_notes_user_updated ON notes(user_id, updated_at DESC);
CREATE INDEX idx_notes_user_deleted ON notes(user_id, deleted_at);
CREATE INDEX idx_notes_user_archived ON notes(user_id, is_archived);
CREATE INDEX idx_notes_user_pinned ON notes(user_id, is_pinned);
CREATE INDEX idx_notes_due_date ON notes(user_id, due_date) WHERE due_date IS NOT NULL;

-- =====================================================
-- TABLE: checklist_items
-- =====================================================

CREATE TABLE checklist_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    content VARCHAR(500) NOT NULL,
    is_completed BOOLEAN NOT NULL DEFAULT FALSE,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT checklist_items_content_not_empty CHECK (TRIM(content) <> ''),
    CONSTRAINT checklist_items_content_length CHECK (CHAR_LENGTH(content) <= 500)
);

CREATE INDEX idx_checklist_items_note_id ON checklist_items(note_id, sort_order);

-- =====================================================
-- TABLE: tags
-- =====================================================

CREATE TABLE tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT tags_name_not_empty CHECK (TRIM(name) <> ''),
    CONSTRAINT tags_name_length CHECK (CHAR_LENGTH(name) <= 50),
    -- One tag name per user (case-insensitive)
    CONSTRAINT tags_user_name_unique UNIQUE (user_id, name)
);

CREATE INDEX idx_tags_user_id ON tags(user_id);
CREATE UNIQUE INDEX idx_tags_user_name_lower ON tags(user_id, LOWER(name));

-- =====================================================
-- TABLE: note_tags (join table)
-- =====================================================

CREATE TABLE note_tags (
    note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,

    PRIMARY KEY (note_id, tag_id)
);

CREATE INDEX idx_note_tags_tag_id ON note_tags(tag_id);
CREATE INDEX idx_note_tags_note_id ON note_tags(note_id);

-- =====================================================
-- TABLE: note_transactions (join table)
-- =====================================================

CREATE TABLE note_transactions (
    note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,

    PRIMARY KEY (note_id, transaction_id)
);

CREATE INDEX idx_note_transactions_transaction_id ON note_transactions(transaction_id);
CREATE INDEX idx_note_transactions_note_id ON note_transactions(note_id);

-- =====================================================
-- TRIGGERS: updated_at
-- =====================================================

CREATE TRIGGER update_notes_updated_at BEFORE UPDATE ON notes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_checklist_items_updated_at BEFORE UPDATE ON checklist_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tags_updated_at BEFORE UPDATE ON tags
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE note_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE note_transactions ENABLE ROW LEVEL SECURITY;

-- ── notes ────────────────────────────────────────────
-- Owner-only access. deleted_at (trash) is changed via the soft
-- delete / restore actions — all owner-only through these same
-- policies.

CREATE POLICY "Users can read own notes"
    ON notes FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notes"
    ON notes FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notes"
    ON notes FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own notes"
    ON notes FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- ── checklist_items ──────────────────────────────────
-- Access granted only when the parent note belongs to the user.

CREATE POLICY "Users can read own checklist items"
    ON checklist_items FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM notes
            WHERE notes.id = checklist_items.note_id
            AND notes.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert own checklist items"
    ON checklist_items FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM notes
            WHERE notes.id = checklist_items.note_id
            AND notes.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update own checklist items"
    ON checklist_items FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM notes
            WHERE notes.id = checklist_items.note_id
            AND notes.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM notes
            WHERE notes.id = checklist_items.note_id
            AND notes.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete own checklist items"
    ON checklist_items FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM notes
            WHERE notes.id = checklist_items.note_id
            AND notes.user_id = auth.uid()
        )
    );

-- ── tags ─────────────────────────────────────────────

CREATE POLICY "Users can read own tags"
    ON tags FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tags"
    ON tags FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tags"
    ON tags FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own tags"
    ON tags FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- ── note_tags ────────────────────────────────────────
-- Both sides must belong to the user. RLS prevents linking
-- another user's tag to another user's note.

CREATE POLICY "Users can manage own note tags"
    ON note_tags FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM notes
            WHERE notes.id = note_tags.note_id
            AND notes.user_id = auth.uid()
        )
        AND EXISTS (
            SELECT 1 FROM tags
            WHERE tags.id = note_tags.tag_id
            AND tags.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM notes
            WHERE notes.id = note_tags.note_id
            AND notes.user_id = auth.uid()
        )
        AND EXISTS (
            SELECT 1 FROM tags
            WHERE tags.id = note_tags.tag_id
            AND tags.user_id = auth.uid()
        )
    );

-- ── note_transactions ────────────────────────────────
-- Both note and transaction must belong to the user, so a user
-- can only ever link THEIR OWN transactions.

CREATE POLICY "Users can manage own note transactions"
    ON note_transactions FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM notes
            WHERE notes.id = note_transactions.note_id
            AND notes.user_id = auth.uid()
        )
        AND EXISTS (
            SELECT 1 FROM transactions
            WHERE transactions.id = note_transactions.transaction_id
            AND transactions.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM notes
            WHERE notes.id = note_transactions.note_id
            AND notes.user_id = auth.uid()
        )
        AND EXISTS (
            SELECT 1 FROM transactions
            WHERE transactions.id = note_transactions.transaction_id
            AND transactions.user_id = auth.uid()
        )
    );

-- =====================================================
-- END OF MIGRATION
-- =====================================================
-- Review completed. Execute this migration using:
-- supabase db push (for local)
-- or apply via Supabase dashboard for production
-- =====================================================
