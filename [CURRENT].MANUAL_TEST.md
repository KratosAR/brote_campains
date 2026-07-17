# Manual Meta WhatsApp E2E Test

**Estado del documento:** 📌 VIGENTE (documento de referencia continuo) — Guía viva de testing manual, se usa según se necesite.


**Quickly send a real WhatsApp message and verify delivery.**

## Prerequisites

1. **Meta credentials in `.env`:**
   ```bash
   META_PHONE_NUMBER_ID=1138669749338044
   META_ACCESS_TOKEN=EAAGVMBd26pkBR6Wvt74QIB...
   ```

2. **Infrastructure running:**
   ```bash
   docker compose -f docker/docker-compose.yml up -d
   ```

3. **API + Worker running:**
   ```bash
   # Terminal 1: API
   pnpm dev

   # Terminal 2: Worker
   cd apps/worker && pnpm dev
   ```

## Run the Test

```bash
npx ts-node manual-meta-whatsapp-test.ts
```

## Expected Output

```
📱 Manual End-to-End Meta WhatsApp Test

1️⃣  Registering workspace...
✅ Workspace registered: 01KXHNCD...

2️⃣  Creating contact with phone: +1(555)154-6755
✅ Contact created: 01KXHNCD...

3️⃣  Creating template...
✅ Template created: 01KXHNCD...

4️⃣  Sending campaign (sendNow=true)...
✅ Campaign created and sent: 01KXHNCD...

5️⃣  Waiting for worker to process (2 seconds)...

6️⃣  Checking delivery status...
✅ Delivery breakdown:
   Total: 1
   Sent: 1

✅ SUCCESS! Message queued for delivery.
📱 Check your WhatsApp account for the message.

📊 Expected status flow:
   Pending → Sending → Sent → Delivered
```

## What This Test Does

1. ✅ Creates a new workspace + user
2. ✅ Creates a contact with a phone number
3. ✅ Creates a WhatsApp template
4. ✅ Sends a campaign immediately (`sendNow: true`)
5. ✅ Waits for worker to process delivery jobs
6. ✅ Queries delivery status via analytics endpoint
7. ✅ Confirms message was queued to Meta WhatsApp

## Troubleshooting

### "No deliveries created"
- Check worker is running: `cd apps/worker && pnpm dev`
- Check Redis is connected: `redis-cli ping`
- Check PostgreSQL is connected: `psql $DATABASE_URL`
- Check logs in both terminals

### "HTTP 400: Invalid credentials"
- Verify `META_PHONE_NUMBER_ID` and `META_ACCESS_TOKEN` in `.env`
- Ensure no whitespace around values
- Regenerate token if needed from Meta dashboard

### "fetch failed"
- Check API is running on port 3000: `curl http://localhost:3000`
- Check firewall/localhost binding

## Next: Full E2E Test

Once manual test passes, run the full test suite:

```bash
cd apps/api
pnpm jest --config jest.config.e2e.js fullWorkflow.test.ts
```

Expected: **10/10 tests passing**
