# screenshot-service

Microservice that takes a screenshot of a URL and uploads it to Cloudinary.

## Setup

```bash
cp .env.example .env
# fill in your values
bun install
```

## Environment variables

| Variable | Description |
|---|---|
| `PORT` | Port to listen on (default: 8080) |
| `SCREENSHOT_SECRET` | Secret token for Bearer auth |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret |

## Run

```bash
bun run dev    # development (watch mode)
bun run build  # compile TypeScript
bun run start  # production
```

## API

### POST /screenshot

Takes a screenshot of `targetUrl` and uploads it to Cloudinary. Responds immediately with 202 and processes async.

**Headers**
```
Authorization: Bearer <SCREENSHOT_SECRET>
Content-Type: application/json
```

**Body**
```json
{
  "jobId": "my-job-123",
  "targetUrl": "https://example.com",
  "callbackUrl": "https://your-server.com/webhook"
}
```

- `jobId` — used as the Cloudinary `public_id`. Required.
- `targetUrl` — URL to screenshot. Required.
- `callbackUrl` — if provided, receives a POST with the result. Optional.

**Response `202`**
```json
{
  "status": "accepted",
  "jobId": "my-job-123"
}
```

**Callback payload** (sent to `callbackUrl` when done)
```json
{
  "jobId": "my-job-123",
  "screenshotUrl": "https://res.cloudinary.com/..."
}
```

## Example

```bash
curl -X POST http://localhost:8080/screenshot \
  -H "Authorization: Bearer your_secret_here" \
  -H "Content-Type: application/json" \
  -d '{"jobId": "test-1", "targetUrl": "https://example.com"}'
```
