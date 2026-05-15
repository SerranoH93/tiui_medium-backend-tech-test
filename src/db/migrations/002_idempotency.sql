ALTER TABLE payment_webhook_logs
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processed', 'failed'));

CREATE UNIQUE INDEX IF NOT EXISTS uq_payment_webhook_logs_provider_event
ON payment_webhook_logs (provider, provider_event_id);