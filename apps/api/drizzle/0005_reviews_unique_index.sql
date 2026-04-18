-- Partial unique index: one active review per user per post
CREATE UNIQUE INDEX IF NOT EXISTS idx_reviews_unique_active
ON reviews(reviewer_id, post_id)
WHERE deleted_at IS NULL;
