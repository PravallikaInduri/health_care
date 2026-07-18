-- Sprint 5 — real-time messaging follow-up
-- Track when a message was last edited so the UI can show an "edited" marker.

ALTER TABLE messages
  ADD COLUMN edited_at DATETIME NULL AFTER read_at;
