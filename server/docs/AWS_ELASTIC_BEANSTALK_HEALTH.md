# Elastic Beanstalk health and HTTP 4xx (BMetrics API)

Application hardening does **not** remove legitimate HTTP 4xx responses from Elastic Beanstalk enhanced-health calculations. Internet scanners hitting nonexistent paths still return 404/401/403. A correct 404 is still a 4xx.

After deploying the hardened API, complete these **AWS console** steps manually. Do not treat an Ok → Severe → Ok enhanced-health flicker as proof that the Node process rebooted.

## 1. ALB target-group health check

1. Open **EC2 → Target Groups** (or the target group linked to the EB environment load balancer).
2. Set the health-check **path** to `/healthz`.
3. Keep the success matcher appropriate for that endpoint (HTTP **200**).
4. Confirm the check does not require authentication, CSRF, or a specific `Host` allowlist value (BMetrics exempts `/healthz` from optional `ALLOWED_HOSTS` validation).

## 2. Elastic Beanstalk enhanced health

1. Open the EB environment → **Configuration** → **Monitoring** / enhanced health settings (wording varies by console version).
2. If supported, **enable the rule to ignore application and/or load-balancer HTTP 4xx** when calculating environment health.
3. **Do not** ignore HTTP **5xx**.
4. **Do not** disable enhanced health entirely.

Ignoring 4xx stops low-volume scanner traffic from driving misleading **100% of requests are HTTP 4xx** Severe transitions when legitimate traffic is sparse.

## 3. CloudWatch metrics to keep watching

| Metric | Why |
|--------|-----|
| `HTTPCode_Target_4XX_Count` | App-generated 4xx (expected scanners + real client errors) |
| `HTTPCode_ELB_4XX_Count` | ELB-generated 4xx (e.g. no registered target) |
| `HTTPCode_Target_5XX_Count` | App failures — investigate |
| `HTTPCode_ELB_5XX_Count` | LB/gateway failures — investigate |
| `HealthyHostCount` / `UnHealthyHostCount` | Target registration / health-check pass-fail |
| `TargetResponseTime` | Latency regressions |

## 4. Distinguishing events (do not conflate)

| Observation | What it usually means |
|-------------|------------------------|
| EB enhanced health Ok → Severe → Ok | Health **scoring** changed (often 4xx ratio). Not proof of a process restart. |
| Node process restart | New PID, fresh bootstrap logs (`[startup] BMetrics API bootstrap beginning`), possible brief `/healthz` gaps. |
| ALB target deregistration | Target leaves the group; `UnHealthyHostCount` / deregistration events in ELB logs. |
| EC2 instance replacement | New instance ID in EB events / EC2 console; full AMI/launch cycle. |
| Auto Scaling activity | Scaling activities in ASG history; capacity change, not merely a health color flicker. |

Use EB **Events**, instance **logs** (`/var/log/web.stdout.log`, eb-engine), and CloudWatch metrics together. An Ok → Severe → Ok cycle alone does **not** prove the server rebooted.

## 5. Related application environment variables

Set on the EB environment (see `server/.env.template`):

| Variable | Recommended production | Notes |
|----------|------------------------|-------|
| `TRUST_PROXY` | `1` | Single ALB hop; set `0` only for local/direct |
| `LOG_SCANNER_REQUESTS` | `false` | Set `true` temporarily to log routine 404s |
| `ALLOWED_HOSTS` | **unset** unless intentionally enabling Host checks | Comma-separated hostnames only; never derived from `HOST` / CORS / Amplify URLs |

## 6. Verified API startup order

Production bootstrap (`server/index.js`) runs in this exact order:

1. `dotenv.config()` (module load) + AWS Secrets Manager (`loadSecrets`)
2. Production configuration validation (`assertProductionDbHost` — refuses loopback hosts when `NODE_ENV=production` or `IN_PROD=true`)
3. Create Express app; modules that read runtime env / open the Sequelize pool load during route registration
4. Configure trust proxy; register `GET /healthz` and application middleware/routes
5. `app.listen()` — traffic (including `/healthz`) is accepted only after the steps above succeed
6. Register graceful shutdown; run async DB `testConnection` / `syncDatabase`

If secret loading or production validation fails, bootstrap exits with code 1 and **does not** call `listen`.

## 7. Safe deployment order

1. Deploy API with `/healthz` and 404 JSON hardening.
2. Confirm target-group health check path is `/healthz` and targets are healthy.
3. Enable EB enhanced-health “ignore HTTP 4xx” (if available).
4. Optionally set `ALLOWED_HOSTS` only after confirming the public hostname(s) clients and the ALB use for non-health traffic.
5. Watch 5xx metrics and bootstrap logs for one soak period before enabling Host validation.
