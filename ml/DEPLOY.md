# Deploying the model service to AWS App Runner

Same shape as [Haemologix-Donor-Backend](https://github.com/Aftab48/Haemologix-Donor-Backend)
(`docs/DEPLOY.md` there covers the shared one-time account setup — OIDC provider, the two
App Runner roles, the `haemologix-min1` autoscaling configuration). This service reuses all
of that; only the ECR repository, the SSM secret, the App Runner service and a deploy role
are new.

```
git push main (ml/** changed)
   └─► GitHub Actions  pytest + "active checkpoint loads"
         └─► docker build ml/Dockerfile (linux/amd64, checkpoints baked in)
               └─► ECR: haemologix-ml:latest + :<sha>
                     └─► apprunner start-deployment → health-checked on /health → smoke test

App Runner instance (0.5 vCPU / 1 GB, ap-south-1)
  ◄─── https://www.haemologix.in (Vercel, ML_API_URL + X-ML-Secret)
```

The service touches no database and no other AWS resource: it loads `/app/checkpoints`
from the image and answers `POST /predict/batch`.

## Cost (approx., verify on the App Runner pricing page)

| Item | Estimate |
| --- | --- |
| Provisioned memory 1 GB × 730 h × ~$0.009 | ~$6.6 / month |
| Active vCPU (billed only while a request is in flight; predictions take ms) | ~$0.5–2 / month |
| ECR (~1 GB image, lifecycle-pruned) + CloudWatch at `info` | ~$0.6 / month |
| **Total** | **≈ $7–9 / month (~$85–100 / year)**. Torch+sklearn RSS is ~600 MB, so 1 GB is comfortable. To halve it later: export the MLP heads to ONNX and serve with `onnxruntime` (no torch) on 0.25 vCPU / 0.5 GB (~$50 / year). |

## One-time setup (run from your machine with admin AWS CLI; nothing here is automated)

```bash
export AWS_REGION=ap-south-1
export ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
export REPO=haemologix-ml
```

### 1. ECR repository
```bash
aws ecr create-repository --repository-name "$REPO" --region "$AWS_REGION" \
  --image-scanning-configuration scanOnPush=true --image-tag-mutability MUTABLE
aws ecr put-lifecycle-policy --repository-name "$REPO" --region "$AWS_REGION" --lifecycle-policy-text \
  '{"rules":[{"rulePriority":1,"description":"keep 10","selection":{"tagStatus":"any","countType":"imageCountMoreThan","countNumber":10},"action":{"type":"expire"}}]}'
```

### 2. Secret in Parameter Store
Use the **same value** as `ML_API_SECRET` on Vercel (the app sends it as `X-ML-Secret`).
```bash
aws ssm put-parameter --name /haemologix/ml/ML_API_SECRET --type SecureString --overwrite \
  --region "$AWS_REGION" --value '<ML_API_SECRET from Vercel>'
```

### 3. Let the existing instance role read it
The shared `haemologix-apprunner-instance` role can only read `/haemologix/app-backend/*`;
add the ML path as a second inline policy:
```bash
sed -e "s/ACCOUNT_ID/$ACCOUNT_ID/g" -e "s/REGION/$AWS_REGION/g" \
  ml/infra/iam/apprunner-instance-ml-policy.json > /tmp/ml-instance-policy.json
aws iam put-role-policy --role-name haemologix-apprunner-instance \
  --policy-name read-ml-secrets --policy-document file:///tmp/ml-instance-policy.json
```

### 4. First image by hand (App Runner cannot create a service on an empty repo)
```bash
aws ecr get-login-password --region "$AWS_REGION" \
  | docker login --username AWS --password-stdin "$ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com"
docker build --platform linux/amd64 -t "$REPO:latest" -f ml/Dockerfile .
docker tag "$REPO:latest" "$ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$REPO:latest"
docker push "$ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$REPO:latest"
```

### 5. Create the service
```bash
ASC_ARN=$(aws apprunner list-auto-scaling-configurations --region "$AWS_REGION" \
  --query "AutoScalingConfigurationSummaryList[?AutoScalingConfigurationName=='haemologix-min1']|[0].AutoScalingConfigurationArn" --output text)
sed -e "s/ACCOUNT_ID/$ACCOUNT_ID/g" -e "s/REGION/$AWS_REGION/g" \
    -e "s#arn:aws:apprunner:[^\"]*haemologix-min1[^\"]*#$ASC_ARN#" \
  ml/infra/apprunner-service.json > /tmp/ml-service.json
aws apprunner create-service --cli-input-json file:///tmp/ml-service.json --region "$AWS_REGION"
```
3–5 minutes later:
```bash
export ML_SERVICE_ARN=$(aws apprunner list-services --region "$AWS_REGION" \
  --query "ServiceSummaryList[?ServiceName=='haemologix-ml'].ServiceArn" --output text)
ML_URL=$(aws apprunner describe-service --service-arn "$ML_SERVICE_ARN" --region "$AWS_REGION" --query 'Service.ServiceUrl' --output text)
curl "https://$ML_URL/health"      # expect model_loaded:true, activeVersion:haemologix-model-1.1
```

### 6. Deploy role for this repository (GitHub OIDC)
The provider already exists from app-backend. The trust policy is pinned to
`Aftab48/Haemologix` `main` (both plain and id-qualified subject forms).
```bash
sed "s/ACCOUNT_ID/$ACCOUNT_ID/g" ml/infra/iam/github-oidc-trust.json > /tmp/ml-trust.json
aws iam create-role --role-name haemologix-ml-github-deploy --assume-role-policy-document file:///tmp/ml-trust.json
sed -e "s/ACCOUNT_ID/$ACCOUNT_ID/g" -e "s/REGION/$AWS_REGION/g" \
  ml/infra/iam/github-deploy-policy.json > /tmp/ml-deploy-policy.json
aws iam put-role-policy --role-name haemologix-ml-github-deploy --policy-name deploy \
  --policy-document file:///tmp/ml-deploy-policy.json
```
Add two repository secrets on **Aftab48/Haemologix** (Settings → Secrets → Actions):

| Secret | Value |
| --- | --- |
| `AWS_ML_DEPLOY_ROLE_ARN` | `arn:aws:iam::<account>:role/haemologix-ml-github-deploy` |
| `ML_APPRUNNER_SERVICE_ARN` | `$ML_SERVICE_ARN` |

Until both exist, `deploy-ml.yml` runs the tests and **skips** the deploy job.

### 7. Point the app at it
Optionally give it a domain (`aws apprunner associate-custom-domain … ml.haemologix.in`,
add the CNAMEs it prints). Then on Vercel:
```
ML_API_URL=https://<ML_URL or ml.haemologix.in>
```
(`ML_API_SECRET` is already set.) Redeploy → `/api/ml/report` shows
`modelService.status: healthy` and new decisions carry `model_version`.

## How a model promotion reaches production

`ml:approve` → `ml:activate` (writes `ml/checkpoints/active` + model card) → **commit
`ml/checkpoints/` and push `main`** → `deploy-ml.yml` builds an image with the new
pointer and rolls it out. Rollback = activate the previous version, commit, push (or
`aws apprunner start-deployment` after retagging `:latest` to the old `:<sha>`).

## Reading a failed boot

`CREATE_FAILED` / rollout failure → CloudWatch log group `/aws/apprunner/haemologix-ml/…/application`.
The startup line `[ml-api] model_dir=… active=… loaded=… tasks=[…]` tells you whether the
checkpoint pointer resolved; `loaded=None` means `ml/checkpoints/active` names a version
that is not in the image.
