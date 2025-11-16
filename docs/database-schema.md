# PermitPro Database Schema Documentation

## Overview

PermitPro uses PostgreSQL 14+ with PostGIS extension for geospatial capabilities. This document describes the complete database schema, relationships, and indexing strategy.

## Database Architecture

- **Primary Database**: PostgreSQL 14+ with PostGIS
- **Vector Database**: Pinecone (for regulatory text embeddings)
- **Cache Layer**: Redis 7+
- **Document Storage**: AWS S3 (references stored in DB)

---

## Core Tables

### users

Stores user account information for all account types.

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    account_type VARCHAR(50) NOT NULL CHECK (account_type IN ('homeowner', 'contractor', 'enterprise')),
    company VARCHAR(255),
    phone VARCHAR(20),
    email_verified BOOLEAN DEFAULT FALSE,
    email_verified_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,  -- Soft delete

    -- Indexes
    CONSTRAINT email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

CREATE INDEX idx_users_email ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_account_type ON users(account_type) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_created_at ON users(created_at DESC);
```

**Key Columns**:
- `id`: UUID primary key for better distribution in sharding
- `account_type`: Determines UI/UX and feature access
- `deleted_at`: Soft delete for data retention compliance

---

### user_addresses

Stores user property addresses (one-to-many with users).

```sql
CREATE TABLE user_addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    label VARCHAR(100),  -- e.g., "Home", "Office", "Rental Property #1"
    street VARCHAR(255) NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(2) NOT NULL,
    zip VARCHAR(10) NOT NULL,
    country VARCHAR(3) DEFAULT 'USA',
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    geog GEOGRAPHY(POINT, 4326),  -- PostGIS geography type
    is_primary BOOLEAN DEFAULT FALSE,
    parcel_id VARCHAR(100),  -- Tax parcel identifier
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_user_addresses_user_id ON user_addresses(user_id);
CREATE INDEX idx_user_addresses_geog ON user_addresses USING GIST(geog);
CREATE INDEX idx_user_addresses_primary ON user_addresses(user_id, is_primary) WHERE is_primary = TRUE;
```

---

### subscriptions

Tracks user subscription plans and status.

```sql
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plan VARCHAR(50) NOT NULL CHECK (plan IN ('free', 'pro', 'contractor', 'enterprise')),
    status VARCHAR(50) NOT NULL CHECK (status IN ('active', 'canceled', 'past_due', 'trialing')),
    stripe_customer_id VARCHAR(255),
    stripe_subscription_id VARCHAR(255),
    current_period_start TIMESTAMP,
    current_period_end TIMESTAMP,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    trial_ends_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_stripe_customer ON subscriptions(stripe_customer_id);
```

---

### projects

Central table for all construction/renovation projects.

```sql
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    project_type VARCHAR(100) NOT NULL,
    address_id UUID REFERENCES user_addresses(id) ON DELETE SET NULL,
    details JSONB,  -- Flexible storage for project-specific data
    classification JSONB,  -- AI classification results
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'discovering', 'ready', 'in_progress', 'submitted', 'approved', 'rejected', 'completed')),
    estimated_value DECIMAL(12, 2),
    estimated_start_date DATE,
    estimated_completion_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

CREATE INDEX idx_projects_user_id ON projects(user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_projects_status ON projects(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_projects_created_at ON projects(created_at DESC);
CREATE INDEX idx_projects_details ON projects USING GIN(details);  -- JSONB indexing
```

**JSONB Structure Examples**:

```json
// details field
{
  "materials": "pressure-treated wood",
  "height_feet": 2,
  "square_footage": 192,
  "attached_to_house": true,
  "electrical_work": false,
  "plumbing_work": false
}

// classification field (AI-generated)
{
  "project_category": "residential",
  "work_types": ["structural"],
  "scope": "addition",
  "risk_level": "low",
  "confidence": 0.95,
  "classified_at": "2024-01-15T10:30:00Z"
}
```

---

### jurisdictions

Government entities that issue permits.

```sql
CREATE TABLE jurisdictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    level VARCHAR(50) NOT NULL CHECK (level IN ('city', 'county', 'state', 'federal')),
    state VARCHAR(2) NOT NULL,
    boundary GEOGRAPHY(MULTIPOLYGON, 4326),  -- Geospatial boundary
    contact_phone VARCHAR(20),
    contact_email VARCHAR(255),
    website_url VARCHAR(500),
    permit_portal_url VARCHAR(500),
    supports_online_submission BOOLEAN DEFAULT FALSE,
    business_hours JSONB,
    metadata JSONB,  -- Additional jurisdiction-specific data
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_jurisdictions_boundary ON jurisdictions USING GIST(boundary);
CREATE INDEX idx_jurisdictions_level_state ON jurisdictions(level, state);
```

**JSONB Example (business_hours)**:
```json
{
  "monday": {"open": "08:00", "close": "17:00"},
  "tuesday": {"open": "08:00", "close": "17:00"},
  "wednesday": {"open": "08:00", "close": "17:00"},
  "thursday": {"open": "08:00", "close": "17:00"},
  "friday": {"open": "08:00", "close": "16:00"},
  "saturday": null,
  "sunday": null
}
```

---

### permit_requirements

Defines what permits are required under what conditions.

```sql
CREATE TABLE permit_requirements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    jurisdiction_id UUID NOT NULL REFERENCES jurisdictions(id) ON DELETE CASCADE,
    permit_type VARCHAR(100) NOT NULL,  -- e.g., 'building', 'electrical', 'plumbing'
    permit_name VARCHAR(255) NOT NULL,
    description TEXT,
    base_fee DECIMAL(10, 2),
    fee_calculation_formula TEXT,  -- e.g., "$50 + $0.50 per sq ft"
    processing_time_min_days INTEGER,
    processing_time_max_days INTEGER,
    conditions JSONB NOT NULL,  -- Rule-based matching conditions
    exemptions JSONB,
    required_documents JSONB,
    active BOOLEAN DEFAULT TRUE,
    effective_date DATE,
    expiration_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_permit_req_jurisdiction ON permit_requirements(jurisdiction_id) WHERE active = TRUE;
CREATE INDEX idx_permit_req_type ON permit_requirements(permit_type);
CREATE INDEX idx_permit_req_conditions ON permit_requirements USING GIN(conditions);
```

**JSONB Example (conditions)**:
```json
{
  "project_types": ["deck", "patio"],
  "min_square_footage": 120,
  "structural_changes": true,
  "any_of": [
    {"height_feet": {"$gte": 30}},
    {"attached_to_house": true}
  ]
}
```

---

### permits

Discovered permits for specific projects.

```sql
CREATE TABLE permits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    requirement_id UUID REFERENCES permit_requirements(id) ON DELETE SET NULL,
    permit_type VARCHAR(100) NOT NULL,
    permit_name VARCHAR(255) NOT NULL,
    required BOOLEAN DEFAULT TRUE,
    fee DECIMAL(10, 2),
    processing_time VARCHAR(100),
    reasoning TEXT,  -- AI explanation
    triggers JSONB,  -- What triggered this requirement
    discovery_method VARCHAR(50) CHECK (discovery_method IN ('rule_based', 'llm', 'hybrid')),
    confidence_score DECIMAL(3, 2),  -- 0.00 to 1.00
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_permits_project_id ON permits(project_id);
CREATE INDEX idx_permits_requirement_id ON permits(requirement_id);
CREATE INDEX idx_permits_type ON permits(permit_type);
```

---

### form_templates

Cached permit application forms.

```sql
CREATE TABLE form_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    jurisdiction_id UUID NOT NULL REFERENCES jurisdictions(id) ON DELETE CASCADE,
    permit_type VARCHAR(100) NOT NULL,
    form_name VARCHAR(255) NOT NULL,
    form_type VARCHAR(50) CHECK (form_type IN ('pdf', 'html', 'online_portal', 'paper')),
    form_url VARCHAR(500),
    pdf_url VARCHAR(500),
    online_portal_url VARCHAR(500),
    form_structure JSONB,  -- Parsed field structure
    raw_content TEXT,  -- Original HTML/PDF content
    version VARCHAR(50),
    last_verified_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(jurisdiction_id, permit_type, version)
);

CREATE INDEX idx_form_templates_jurisdiction_type ON form_templates(jurisdiction_id, permit_type);
CREATE INDEX idx_form_templates_last_verified ON form_templates(last_verified_at);
```

**JSONB Example (form_structure)**:
```json
{
  "fields": [
    {
      "field_name": "applicant_name",
      "field_type": "text",
      "label": "Applicant Name",
      "required": true,
      "max_length": 100,
      "auto_fillable": true,
      "data_source": "user.name"
    },
    {
      "field_name": "project_address",
      "field_type": "address",
      "label": "Project Location",
      "required": true,
      "auto_fillable": true,
      "data_source": "project.address"
    }
  ]
}
```

---

### filled_forms

Auto-filled form data for projects.

```sql
CREATE TABLE filled_forms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    permit_id UUID NOT NULL REFERENCES permits(id) ON DELETE CASCADE,
    form_template_id UUID REFERENCES form_templates(id) ON DELETE SET NULL,
    filled_data JSONB NOT NULL,
    confidence_scores JSONB,
    missing_fields JSONB,
    validation_results JSONB,
    ready_to_submit BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_filled_forms_project ON filled_forms(project_id);
CREATE INDEX idx_filled_forms_permit ON filled_forms(permit_id);
```

---

### submissions

Permit application submissions.

```sql
CREATE TABLE submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    permit_id UUID NOT NULL REFERENCES permits(id) ON DELETE CASCADE,
    filled_form_id UUID REFERENCES filled_forms(id) ON DELETE SET NULL,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'submitted', 'under_review', 'approved', 'rejected', 'more_info_needed', 'withdrawn')),
    tracking_number VARCHAR(100),
    submission_method VARCHAR(50) CHECK (submission_method IN ('online', 'email', 'in_person', 'mail', 'api')),
    submitted_at TIMESTAMP,
    reviewed_at TIMESTAMP,
    approved_at TIMESTAMP,
    rejected_at TIMESTAMP,
    rejection_reason TEXT,
    municipality_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_submissions_project_id ON submissions(project_id);
CREATE INDEX idx_submissions_status ON submissions(status);
CREATE INDEX idx_submissions_tracking_number ON submissions(tracking_number);
CREATE INDEX idx_submissions_submitted_at ON submissions(submitted_at DESC);
```

---

### submission_status_history

Audit trail for submission status changes.

```sql
CREATE TABLE submission_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
    old_status VARCHAR(50),
    new_status VARCHAR(50) NOT NULL,
    message TEXT,
    changed_by VARCHAR(50),  -- 'system', 'user', 'municipality'
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_submission_history_submission ON submission_status_history(submission_id, created_at DESC);
```

---

### documents

Supporting documents uploaded by users.

```sql
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(100),
    file_size_bytes BIGINT,
    document_type VARCHAR(100) CHECK (document_type IN ('site_plan', 'photo', 'contractor_license', 'insurance', 'survey', 'drawing', 'other')),
    s3_bucket VARCHAR(100),
    s3_key VARCHAR(500),
    s3_url VARCHAR(1000),
    thumbnail_url VARCHAR(1000),
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

CREATE INDEX idx_documents_project_id ON documents(project_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_documents_user_id ON documents(user_id) WHERE deleted_at IS NULL;
```

---

### building_codes

Reference table for building codes and requirements.

```sql
CREATE TABLE building_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code_reference VARCHAR(100) NOT NULL,  -- e.g., 'IBC Section R507'
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    code_type VARCHAR(50) CHECK (code_type IN ('IBC', 'IRC', 'NEC', 'IPC', 'IMC', 'local')),
    jurisdiction_id UUID REFERENCES jurisdictions(id) ON DELETE CASCADE,  -- NULL for national codes
    full_text TEXT,
    requirements JSONB,
    effective_date DATE,
    version VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(code_reference, jurisdiction_id, version)
);

CREATE INDEX idx_building_codes_reference ON building_codes(code_reference);
CREATE INDEX idx_building_codes_type ON building_codes(code_type);
CREATE INDEX idx_building_codes_jurisdiction ON building_codes(jurisdiction_id);
CREATE INDEX idx_building_codes_full_text ON building_codes USING GIN(to_tsvector('english', full_text));
```

---

### permit_building_codes

Many-to-many relationship between permits and building codes.

```sql
CREATE TABLE permit_building_codes (
    permit_id UUID NOT NULL REFERENCES permits(id) ON DELETE CASCADE,
    building_code_id UUID NOT NULL REFERENCES building_codes(id) ON DELETE CASCADE,
    relevance_score DECIMAL(3, 2),  -- How relevant this code is (0.00-1.00)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (permit_id, building_code_id)
);

CREATE INDEX idx_permit_codes_permit ON permit_building_codes(permit_id);
CREATE INDEX idx_permit_codes_building_code ON permit_building_codes(building_code_id);
```

---

### inspections

Inspection scheduling and tracking.

```sql
CREATE TABLE inspections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
    inspection_type VARCHAR(100) NOT NULL,  -- e.g., 'foundation', 'framing', 'final'
    scheduled_date DATE,
    scheduled_time TIME,
    inspector_name VARCHAR(255),
    inspector_phone VARCHAR(20),
    status VARCHAR(50) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'passed', 'failed', 'canceled')),
    result TEXT,
    notes TEXT,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_inspections_submission ON inspections(submission_id);
CREATE INDEX idx_inspections_scheduled_date ON inspections(scheduled_date);
CREATE INDEX idx_inspections_status ON inspections(status);
```

---

### payments

Payment transactions.

```sql
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    submission_id UUID REFERENCES submissions(id) ON DELETE SET NULL,
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    payment_type VARCHAR(50) CHECK (payment_type IN ('permit_fee', 'subscription', 'credit_purchase')),
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'succeeded', 'failed', 'refunded')),
    stripe_payment_intent_id VARCHAR(255),
    stripe_charge_id VARCHAR(255),
    payment_method_last4 VARCHAR(4),
    payment_method_brand VARCHAR(50),
    receipt_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_payments_user_id ON payments(user_id);
CREATE INDEX idx_payments_submission_id ON payments(submission_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_stripe_intent ON payments(stripe_payment_intent_id);
```

---

### notifications

User notifications.

```sql
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    submission_id UUID REFERENCES submissions(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('status_update', 'inspection_scheduled', 'approval', 'rejection', 'payment', 'general')),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP,
    sent_via_email BOOLEAN DEFAULT FALSE,
    sent_via_sms BOOLEAN DEFAULT FALSE,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id, read, created_at DESC);
CREATE INDEX idx_notifications_project_id ON notifications(project_id);
```

---

### api_keys

API keys for programmatic access (enterprise users).

```sql
CREATE TABLE api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    key_hash VARCHAR(255) NOT NULL,  -- Hashed API key
    key_prefix VARCHAR(10) NOT NULL,  -- First chars for identification
    name VARCHAR(100) NOT NULL,
    scopes JSONB,  -- Permissions/scopes
    last_used_at TIMESTAMP,
    expires_at TIMESTAMP,
    revoked BOOLEAN DEFAULT FALSE,
    revoked_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_api_keys_user_id ON api_keys(user_id) WHERE NOT revoked;
CREATE INDEX idx_api_keys_prefix ON api_keys(key_prefix);
```

---

### audit_logs

Comprehensive audit trail for compliance.

```sql
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,  -- e.g., 'user.login', 'project.create', 'submission.submit'
    entity_type VARCHAR(50),  -- e.g., 'project', 'submission'
    entity_id UUID,
    ip_address INET,
    user_agent TEXT,
    request_id UUID,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id, created_at DESC);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
```

---

## Materialized Views

### user_project_stats

Pre-computed user statistics for dashboard.

```sql
CREATE MATERIALIZED VIEW user_project_stats AS
SELECT
    u.id as user_id,
    COUNT(DISTINCT p.id) as total_projects,
    COUNT(DISTINCT CASE WHEN p.status = 'completed' THEN p.id END) as completed_projects,
    COUNT(DISTINCT CASE WHEN p.status IN ('in_progress', 'submitted') THEN p.id END) as active_projects,
    COUNT(DISTINCT s.id) as total_submissions,
    COUNT(DISTINCT CASE WHEN s.status = 'approved' THEN s.id END) as approved_submissions,
    SUM(pmt.amount) as total_spent,
    MAX(p.updated_at) as last_project_date
FROM users u
LEFT JOIN projects p ON u.id = p.user_id AND p.deleted_at IS NULL
LEFT JOIN submissions s ON p.id = s.project_id
LEFT JOIN payments pmt ON u.id = pmt.user_id AND pmt.status = 'succeeded'
GROUP BY u.id;

CREATE UNIQUE INDEX idx_user_project_stats_user_id ON user_project_stats(user_id);
```

**Refresh Strategy**: Refresh every hour or on-demand after major updates.

---

## Database Functions

### Function: Calculate Permit Fee

```sql
CREATE OR REPLACE FUNCTION calculate_permit_fee(
    p_requirement_id UUID,
    p_project_details JSONB
) RETURNS DECIMAL(10, 2) AS $$
DECLARE
    v_base_fee DECIMAL(10, 2);
    v_formula TEXT;
    v_square_footage INTEGER;
    v_calculated_fee DECIMAL(10, 2);
BEGIN
    SELECT base_fee, fee_calculation_formula
    INTO v_base_fee, v_formula
    FROM permit_requirements
    WHERE id = p_requirement_id;

    IF v_formula IS NULL THEN
        RETURN v_base_fee;
    END IF;

    -- Simple formula parser (expand as needed)
    v_square_footage := (p_project_details->>'square_footage')::INTEGER;

    -- Example: "$50 + $0.50 per sq ft"
    -- This is simplified - production would use more robust parsing
    v_calculated_fee := v_base_fee;

    RETURN v_calculated_fee;
END;
$$ LANGUAGE plpgsql;
```

### Trigger: Update Updated_at Timestamp

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ... apply to all relevant tables
```

---

## Performance Considerations

### Partitioning Strategy

For high-growth tables, implement partitioning:

```sql
-- Partition audit_logs by month
CREATE TABLE audit_logs_2025_01 PARTITION OF audit_logs
    FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

CREATE TABLE audit_logs_2025_02 PARTITION OF audit_logs
    FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');
```

### Query Optimization Tips

1. **Always use indexes** for foreign keys and frequently queried columns
2. **Use EXPLAIN ANALYZE** to identify slow queries
3. **Partition large tables** (audit_logs, notifications) by date
4. **Use materialized views** for complex aggregations
5. **Implement connection pooling** (PgBouncer recommended)

---

## Backup & Recovery

### Backup Strategy

- **Full backup**: Daily at 2 AM UTC
- **Incremental backup**: Every 6 hours
- **WAL archiving**: Continuous
- **Retention**: 30 days
- **Cross-region replication**: Real-time to backup region

### Disaster Recovery

- **RTO (Recovery Time Objective)**: 4 hours
- **RPO (Recovery Point Objective)**: 15 minutes
- **Automated failover**: To read replica in separate availability zone

---

## Security Measures

1. **Encryption at rest**: All tables encrypted using AWS KMS
2. **Encryption in transit**: TLS 1.3 required for all connections
3. **Row-level security**: Enabled for multi-tenant isolation
4. **Audit logging**: All data access logged to audit_logs
5. **Password hashing**: bcrypt with cost factor 12
6. **API key hashing**: SHA-256 with salt

---

## Migration Strategy

Migrations are managed using **Flyway** or **Liquibase**.

### Migration Naming Convention

```
V{version}__{description}.sql

Examples:
V001__initial_schema.sql
V002__add_building_codes.sql
V003__add_payment_tables.sql
```

### Example Migration

```sql
-- V001__initial_schema.sql
BEGIN;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- Create all tables...

COMMIT;
```

---

## Monitoring

### Key Metrics to Monitor

- **Query performance**: Slow query log (>100ms)
- **Connection pool**: Utilization percentage
- **Table bloat**: Vacuum and analyze stats
- **Index usage**: Unused indexes
- **Replication lag**: Between primary and replicas
- **Disk usage**: Table and index sizes

### Alerts

- Alert if connection pool >80% utilized
- Alert if replication lag >5 seconds
- Alert if any query >1 second
- Alert if table bloat >30%

---

## Data Retention Policies

| Table | Retention Period | Action After |
|-------|------------------|--------------|
| audit_logs | 7 years | Archive to S3 |
| notifications | 90 days | Hard delete |
| submission_status_history | Indefinite | Keep all |
| projects (deleted) | 30 days | Permanent delete |
| users (deleted) | 30 days | Permanent delete |

---

## Scaling Considerations

### Vertical Scaling (0-10K users)
- Start: db.t3.medium (2 vCPU, 4GB RAM)
- Scale to: db.r5.large (2 vCPU, 16GB RAM)

### Horizontal Scaling (10K+ users)
- **Read replicas**: 2-3 replicas for read-heavy queries
- **Sharding strategy**: Shard by user_id hash
- **Caching**: Redis for hot data (jurisdictions, form templates)

### When to Shard

Shard when:
- Database size >500GB
- Write throughput >5K TPS
- Read replicas not sufficient

**Shard key**: `user_id` (ensures user data stays together)

---

## Conclusion

This schema is designed for:
- **Scalability**: Can handle millions of users with sharding
- **Performance**: Optimized indexes and materialized views
- **Compliance**: Full audit trail and data retention
- **Flexibility**: JSONB for evolving requirements
- **Reliability**: Backup, replication, and disaster recovery

For questions or schema changes, consult the database team lead.
