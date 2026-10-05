# PyOrex HUB Scheduler

Small Cloudflare Worker that triggers the protected HUB collector twice weekly (Monday and Thursday, 12:17 UTC / 07:17 Peru).

## Required secrets

Configure these in the Worker environment; never commit their values:

- `HUB_INGEST_TOKEN`: must match the Pages secret used by `/api/hub/collect`.
- `MANUAL_RUN_TOKEN`: separate token for optional authenticated `POST/GET /run` testing.

The scheduled handler calls `https://pyorex.com/api/hub/collect`. Publication is not automatic: changed sources enter `hub_candidates` and must pass the intelligence/validation layer before becoming HUB events.
