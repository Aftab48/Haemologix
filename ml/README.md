# Haemologix Decision Intelligence (ML)

The Haemologix model **replaces the external LLM** as the reasoning layer for the
agents. Deterministic rules stay authoritative for hard constraints; the model
predicts *outcomes*; a thin policy layer turns predictions into decisions; and
everything the model says is logged so it can be judged against reality before it
is trusted.

```
Agent (lib/agents/*) ── hard constraints ──► candidates + features (lib/ml/features.ts)
        │
        ├──► lib/ml/agentBridge.consultModel ──HTTP──► ml/haemologix/api.py (FastAPI, active version)
        │             │ off / timeout / down → deterministic fallback (fallback_reason logged)
        ▼             ▼
   lib/ml/policy/*   predictions → decision (vetoes: compatibility, eligibility, cold chain)
   lib/ml/explain    structured explanation (replaces LLM prose)
   lib/ml/record     ModelPrediction rows → outcomes back-filled → real training data
```

## Prediction tasks (one model head each)

| task | kind | label |
|---|---|---|
| `donor_accept` | binary | donor accepts the notification |
| `donor_show` | binary | donor arrives given acceptance |
| `donor_response_time` | regression | minutes to respond |
| `donor_eta` | regression | minutes from acceptance to arrival |
| `inventory_delivery_ok` | binary | reserved unit delivered usable, in time |
| `delivery_time` | regression | minutes reservation → delivery |
| `urgency_priority` | 4-class | oracle urgency (LOW/MEDIUM/HIGH/CRITICAL) |
| `alert_resolves_in_window` | binary | alert fully resolved before deadline |
| `eligibility_needs_review` | binary | reviewer would flag the deterministic result |

Feature builders live in `lib/ml/features.ts` and are shared by the simulator and
the agents, so train/serve skew is structurally impossible.

## Lifecycle (plan §2)

```
Simulate → Train → Evaluate → Pilot (shadow) → Observe → Validate → Retrain → Approve → Activate → Repeat
```

### 1. Simulate (TypeScript, no DB)

```bash
npm run sim:run -- --n 100000 --seed 42 --out ml/data/sim/v3 --version sim-v3
npm run sim:run -- --n 500 --kind B --quality          # policy quality only
npm run sim:run -- --n 1000 --no-ladder                 # sim-v2 coordinator (no escalation ladder)
npx tsx scripts/sim/compare.ts --n 400                  # deterministic vs ML policy (oracle / noisy)
npx tsx scripts/sim/compare.ts --ladder-ab --n 600      # what the escalation ladder buys (same seeds, on vs off)
npm run test:sim
```

`lib/sim/` runs the full alert lifecycle with the agents' own deterministic
functions; behaviour comes from `lib/sim/priors.ts` (assumptions — recalibrate with
`npm run sim:calibrate` once real outcomes exist). Scenario families A–G cover the
plan's edge cases; `random` samples the combinatorial space. Output: one JSONL per
task + `manifest.json` (seed, mix, priors hash/version, ladder flag, git sha).

**sim-v3 — escalation ladder.** The sim's coordinator now runs production's
escalation ladder (`lib/ml/policy/escalationLadder.ts` `decideNextRung`, the same
function `lib/agents/escalation.ts` uses): after an empty local search it widens the
donor radius in tiers (→ 100 km, inventory re-checked each rung), broadcasts to nearby
facilities (a responding facility surfaces unrecorded stock — `PRIORS.broadcast`,
assumed), then hands off to a human. New cascading-failure families **H** (empty local
ring), **I** (dark inventory → broadcast), **J** (thin then wide → dwell, widen),
**K** (total failure → early hand-off); default mix 60% random / 28% A–G / 12% H–K.
New rows: `alert_resolves_in_window` is emitted once per search (rung) with
`escalationRung`, `minutesSinceAlert`, `previouslyNotified`, and a 10th task
**`expansion_yield`** (P(next radius tier finds ≥ 1 new eligible donor)) is emitted at
every expansion decision. `runScenario(spec, { ladder: false })` reproduces sim-v2
bit-for-bit — guarded by `lib/sim/__fixtures__/sim-v2-hashes.json`
(`scripts/sim/freezeFixture.ts`). Old checkpoints ignore the new feature columns until
retrained.

### 2. Train / evaluate (Python)

```bash
cd ml && ./setup.sh   # or setup.bat  → .venv
python -m haemologix.train --version haemologix-model-1.2 --data data/sim/v3 --max-rows 400000
```

Per task: rules baseline (what agents assume today) vs GBDT vs PyTorch MLP on a
group-split held-out set; winner saved with its preprocessor; `model_card.json`
records dataset lineage, metrics, whether each task beats the baseline, and
limitations. `pytest ml/tests` covers preprocessing, models, training and the API.

### 3. Serve

```bash
cd ml && python serve.py                        # or: docker compose up ml-api
curl localhost:8000/health
```

`ML_API_URL`, `ML_API_SECRET`, `ML_TIMEOUT_MS` in `ml/.env` (and the app env).
`ml/checkpoints/active` names the served version (`ML_ACTIVE_VERSION` overrides).

### 4. Pilot (shadow → advise → authority)

Per-agent authority via env: `ML_MODE_DEFAULT` and `ML_MODE_{HOSPITAL,DONOR,COORDINATOR,INVENTORY,LOGISTICS,VERIFICATION}`
∈ `off | shadow | advise | authority`. In shadow/advise the model is consulted and
logged but the deterministic decision is applied. Every consult writes
`ModelPrediction` rows; agents and the scheduler (`/api/cron/agent-tick`) back-fill
`actualOutcome`/`error`. Compare at `/api/ml/report` and the admin "Model Reasoning" tab.

### 5. Learn (controlled retraining, human approval)

```bash
npm run ml:harvest -- --out ml/data/real/v1                     # real outcomes → JSONL
npm run sim:calibrate                                           # priors vs observed
cd ml && python -m haemologix.retrain --version haemologix-model-1.1 --sim data/sim/v1 --real data/real/v1 --min-real-rows 200
npm run ml:register -- --version haemologix-model-1.1
npm run ml:approve  -- --version haemologix-model-1.1 --by "<name>" --confirm   # gate: beats baseline, no regression vs active
npm run ml:activate -- --version haemologix-model-1.1                          # flips pointer + reloads service; rollback = activate previous
```

Nothing ever activates automatically; production behaviour changes only through
`ml:activate` after `ml:approve`.

#### Donor commitment release and the `donor_*` features

Production donors can be *released* from an accepted alert (donor "I can't make
it", coordinator, or the system when the alert is over — see
`lib/agents/commitment.ts`). For the model:

- `donor_show` label: a donor/coordinator release records `actual = 0`, same as a
  no-show (they did not arrive). System releases record nothing.
- `priorNoShows` keeps its trained meaning **"accepted and did not arrive"** =
  `noShow OR releasedAt`. That is what the simulator has always meant by
  `history.noShows` (`accepted − arrived`), so `haemologix-model-1.2` sees no
  distribution shift.
- `priorReleases` is a new key (donor/coordinator releases only). Served models
  ignore unknown keys; it is **constant 0 in every sim export** until release
  behaviour is modelled in `lib/sim`, so a model trained on sim data alone cannot
  learn from it yet — treat it as reserved until the next retrain with real rows.

## Layout

```
ml/
  haemologix/         package: tasks, data, models (mlp/gbdt/rules), metrics, train, retrain, registry, api
  tests/              pytest
  data/sim/<ver>/     simulator datasets (JSONL, gitignored) + manifest.json
  data/real/<ver>/    harvested outcomes
  checkpoints/<ver>/  model_card.json + per-task preprocessor/model/metrics ; `active` pointer
  legacy/             the retired imitation model (not imported)
  serve.py, Dockerfile, requirements.txt, .env (from env.ml.example)
lib/ml/               types, flags, features, modelClient, agentBridge, policy/*, explain, record
lib/sim/              rng, types, priors, world, behaviour, engine, scenarios, metrics, dataset, policy, mlPolicy, hash, __fixtures__ (sim-v2 reproduction)
scripts/sim/          run.ts, compare.ts, calibrate.ts
scripts/ml/           loadEnv, seedBaseline, harvestTrainingData, registerModel, approveModel, activateModel
```
