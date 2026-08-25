# Sky Warehouse Sync

A deterministic TypeScript batch-preparation service for bounded warehouse-ingestion workflows in the SKYCOIN4444 engineering portfolio.

## Implemented

- `POST /api/v1/prepare` with strict bounded validation.
- Up to 1,000 records per request.
- Explicit source, destination, table, and primary-key contract.
- Primitive JSON record values only.
- Invalid primary-key rows are reported by source index.
- Duplicate primary keys are collapsed deterministically with last-write-wins semantics.
- Output rows and object keys are normalized for deterministic replay.
- SHA-256 batch identity over normalized configuration and rows.
- Health/readiness endpoints, bounded request bodies, tests, production dependency audit, non-root container packaging, and runtime smoke verification.

## Example

```json
{
  "source": "postgres",
  "destination": "warehouse",
  "table": "public.users",
  "primary_key": "id",
  "records": [
    {"id": 1, "name": "Alice"},
    {"id": 2, "name": "Bob"}
  ]
}
```

The response contains the normalized rows and a stable `sha256:<digest>` batch identifier suitable for downstream idempotency or manifest tracking.

## Product boundary

Status: **engineering beta**.

This service prepares and validates deterministic batches. It does **not** currently connect to PostgreSQL, BigQuery, Snowflake, Redshift, object storage, or any other external warehouse. It does not claim CDC, schema migration, durable job state, scheduling, distributed exactly-once delivery, transactional writes, credential management, tenant isolation, HA, or production deployment.

External source/destination adapters should be implemented and verified as explicit integrations rather than represented by simulated job status.

## Run

```bash
npm install
npm run build
npm test -- --runInBand
npm start
```

## License

See `LICENSE`.
