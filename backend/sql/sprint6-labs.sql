-- Sprint 6 — Lab orders with requested tests + patient-uploaded results
-- A lab order now carries a list of requested tests (set by the provider), and
-- patients can upload result files against the order from their portal.

CREATE TABLE IF NOT EXISTS lab_order_tests (
  id CHAR(36) PRIMARY KEY,
  lab_order_id CHAR(36) NOT NULL,
  test_name VARCHAR(255) NOT NULL,
  instructions TEXT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lab_order_id) REFERENCES lab_orders(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS lab_order_results (
  id CHAR(36) PRIMARY KEY,
  lab_order_id CHAR(36) NOT NULL,
  test_name VARCHAR(255) NULL,
  file_name VARCHAR(255) NOT NULL,
  mime VARCHAR(100),
  file_data LONGBLOB,
  note TEXT NULL,
  uploaded_by CHAR(36),
  uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lab_order_id) REFERENCES lab_orders(id) ON DELETE CASCADE
);

CREATE INDEX idx_lab_order_tests_order ON lab_order_tests(lab_order_id);
CREATE INDEX idx_lab_order_results_order ON lab_order_results(lab_order_id);
