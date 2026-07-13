# BROTE Performance Optimization — Sprint 9 Phase 2

## Caching Strategy

### CacheService

Application-level caching wrapper around Redis with three key features:

**Workspace Cache** (5 min TTL)
- Stores workspace configuration, settings, and metadata
- High-frequency reads, infrequent writes
- Invalidated on workspace updates

**User Permissions** (5 min TTL)
- Caches role/permission checks to avoid DB queries on every request
- Invalidated when workspace membership or permissions change
- Reduces authorization query load from O(n) to O(1) after first request

**Template Cache** (10 min TTL)
- Longer TTL due to template stability (rarely modified)
- Reduces template rendering queries during campaign execution
- Invalidated on template creation/update

### Cache Invalidation

MVP approach uses Redis TTL expiration. For production scale:
- Use Redis SCAN + DEL with key pattern matching for pattern-based invalidation
- Example: `template:*` pattern invalidation on workspace deletion
- Documented as `ponytail:` comment in `CacheService.invalidateWorkspaceTemplates()`

## Cursor-Based Pagination

### Problem: Offset Pagination at Scale

Offset pagination (`LIMIT 10 OFFSET 100`) becomes inefficient:
- Small offset (10): Single index scan
- Large offset (1M): Database must skip 1M rows before fetching 10
- O(n) seek time, CPU waste, connection hold time

With 100k+ contacts or deliveries, offset pagination causes:
- Slow page navigation on large datasets
- Database server strain from repeated index scans
- Increased latency on paginated list endpoints

### Solution: Keyset Pagination

Cursor-based pagination uses the last seen row as the seek point:

```typescript
// Next page starts after this contact ID
const cursor = CursorEncoder.encode('contact-123', new Date())
// Server decodes and fetches: WHERE id > 'contact-123' LIMIT 10
```

**Benefits:**
- O(1) seek time (direct index lookup)
- Constant latency regardless of page depth
- Stateless: cursor is embedded in response
- Handles concurrent inserts/deletes (stable iteration)

### Implementation

**Endpoints with Cursor Pagination:**
- `GET /workspaces/:id/contacts/search` — with optional filters (q, status, tags, group)
- `GET /workspaces/:id/campaigns/:campaignId/deliveries` — with optional status filter

**Repository Methods:**
- `PrismaContactRepository.searchCursor()` — multi-filter search with cursor
- `PrismaDeliveryRepository.findByCampaignCursor()` — filtered deliveries with cursor

**Usage Example:**
```typescript
const result = await contactRepo.searchCursor(
  workspaceId,
  { q: 'John', status: 'ACTIVE' },
  { limit: 50, cursor: undefined } // First page
)

// Response includes
{
  items: [ /* 50 contacts */ ],
  nextCursor: 'Y29udGFjdC0xMjM6MTY5MDAwMDAwMDAwMA==',
  hasMore: true,
  limit: 50
}

// Next request uses the cursor
const nextPage = await contactRepo.searchCursor(workspaceId, filters, {
  limit: 50,
  cursor: result.nextCursor
})
```

## Database Indexing Strategy

### Existing Indexes (From Prisma Schema)

**Contact Table:**
- `workspaceId` — query filtering
- `id, workspaceId` — unique contacts per workspace
- Tags relation — group filtering (join support)

**Delivery Table:**
- `campaignId, workspaceId` — campaign deliveries
- `providerMessageId` — status sync lookups
- Status grouping — aggregation queries

### Recommended Additions (Future)

For future phases, add composite indexes for common filters:

```sql
-- Contact search speed
CREATE INDEX idx_contact_workspace_status ON "Contact"("workspaceId", "status");
CREATE INDEX idx_contact_workspace_acceptsCampaigns ON "Contact"("workspaceId", "acceptsCampaigns");

-- Delivery filtering
CREATE INDEX idx_delivery_campaign_status ON "Delivery"("campaignId", "status");
```

These are deferred to Phase 3 (Observability) when profiling data informs priority.

## Performance Tuning Checklist

- [x] Redis cluster with 5-minute workspace cache TTL
- [x] Cursor-based pagination for large datasets (contacts, deliveries)
- [x] Template cache with 10-minute TTL
- [x] Permission cache (5-minute TTL) to reduce auth queries
- [ ] Connection pooling tuning (via Prisma `connectionLimit`)
- [ ] Database statistics refresh (for query planner)
- [ ] Composite index addition (if query analysis shows hotspots)

## Monitoring

Track performance via Prometheus metrics:

```
# Query latency (milliseconds)
cache_hit_duration_ms
cache_miss_duration_ms
cursor_pagination_latency_ms

# Cache statistics
cache_hits_total
cache_misses_total
cache_evictions_total
```

Add alerting in Phase 3 (Observability).

## Migration Path

1. **Phase 2 (done):** Implement caching + cursor pagination in code
2. **Phase 3:** Add Prometheus metrics, Grafana dashboards, alerting
3. **Production:** Monitor real workload patterns, adjust TTLs and composite indexes

## Reference

- Cursor format: Base64-encoded `id:timestamp`
- Cache key format: `[namespace]:[id]` (e.g., `workspace:ws-123`)
- Pagination uses keyset (cursor) model per Pagination.md best practices
