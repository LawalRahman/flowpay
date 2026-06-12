# Disaster Recovery

Comprehensive disaster recovery and business continuity plan.

## Overview

Disaster recovery ensures FlowPay can recover from critical failures.

## Recovery Time Objectives (RTO) & Recovery Point Objectives (RPO)

| Service | RTO | RPO |
|---------|-----|-----|
| API Backend | 15 minutes | 1 minute |
| Database | 30 minutes | 5 minutes |
| Frontend | 5 minutes | N/A |
| Redis Cache | 10 minutes | 0 (non-persistent) |

## Backup Strategy

### Database Backups

```bash
# Automated daily backup
aws rds create-db-snapshot \
  --db-instance-identifier flowpay-prod \
  --db-snapshot-identifier flowpay-prod-daily-$(date +%Y%m%d)

# Weekly backup retention
aws rds describe-db-snapshots \
  --query 'DBSnapshots[?Engine==`postgres`]' \
  --output table

# Copy snapshot to another region
aws rds copy-db-snapshot \
  --source-db-snapshot-identifier arn:aws:rds:us-east-1:123456789:snapshot:flowpay-prod-daily-20240115 \
  --target-db-snapshot-identifier flowpay-prod-backup-us-west-2 \
  --source-region us-east-1 \
  --destination-region us-west-2
```

### Application Data Backups

```bash
# Export database to S3
aws rds start-export-task \
  --export-task-identifier flowpay-export-20240115 \
  --source-arn arn:aws:rds:us-east-1:123456789:snapshot:flowpay-prod-daily-20240115 \
  --s3-bucket-name flowpay-backups \
  --s3-prefix exports/ \
  --iam-role-arn arn:aws:iam::123456789:role/rds-s3-export

# Backup application code
git bundle create flowpay-20240115.bundle --all
aws s3 cp flowpay-20240115.bundle s3://flowpay-backups/code/
```

### Configuration Backups

```bash
# Backup Kubernetes manifests
kubectl get all -n flowpay-prod -o yaml > flowpay-k8s-backup.yaml
aws s3 cp flowpay-k8s-backup.yaml s3://flowpay-backups/k8s/

# Backup Secrets Manager
aws secretsmanager list-secrets --query 'SecretList[].Name' \
  --output text | while read secret; do
  aws secretsmanager get-secret-value --secret-id "$secret" \
    --query 'SecretString' --output text > "/backups/$secret.json"
done
```

## Failure Scenarios & Recovery

### Scenario 1: Database Failure

**Detection**:
```bash
# Monitor database connectivity
./scripts/health-check.sh
# Alert if unable to connect
```

**Recovery**:
```bash
# 1. Identify latest good backup
aws rds describe-db-snapshots \
  --db-instance-identifier flowpay-prod \
  --query 'DBSnapshots[0]'

# 2. Create new instance from snapshot
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier flowpay-prod-restored \
  --db-snapshot-identifier flowpay-prod-daily-20240115 \
  --db-instance-class db.t3.small

# 3. Wait for restoration to complete
aws rds wait db-instance-available \
  --db-instance-identifier flowpay-prod-restored

# 4. Update connection strings
kubectl set env deployment/backend \
  DATABASE_URL="postgresql://admin:password@flowpay-prod-restored.xxxxx.rds.amazonaws.com:5432/flowpay" \
  -n flowpay-prod

# 5. Verify application connectivity
kubectl rollout restart deployment/backend -n flowpay-prod
kubectl logs -f deployment/backend -n flowpay-prod
```

**RTO: 30 minutes | RPO: Last hourly backup**

### Scenario 2: Kubernetes Cluster Failure

**Detection**:
```bash
# Monitor cluster health
kubectl cluster-info
kubectl get nodes

# Alert if nodes unavailable
```

**Recovery**:
```bash
# 1. Create new cluster
eksctl create cluster \
  --name flowpay-prod-new \
  --region us-east-1 \
  --version 1.27

# 2. Install required tools
helm install prometheus prometheus-community/kube-prometheus-stack
helm install ingress-nginx ingress-nginx/ingress-nginx

# 3. Restore Secrets
kubectl create secret generic flowpay-secrets \
  --from-file=./secrets/ -n flowpay-prod

# 4. Restore deployments
kubectl apply -f k8s/production/ -n flowpay-prod

# 5. Restore volumes from snapshots
aws ec2 describe-snapshots --owner-ids self

# 6. Update DNS to point to new cluster
aws route53 change-resource-record-sets \
  --hosted-zone-id ZONE_ID \
  --change-batch file://dns-update.json
```

**RTO: 2 hours | RPO: Last deployment manifest**

### Scenario 3: Application Crash

**Detection**:
```bash
# Monitor pod restarts
kubectl get pods -n flowpay-prod -w

# Alert if pod restart count exceeds threshold
```

**Recovery**:
```bash
# 1. Check pod logs
kubectl logs deployment/backend -n flowpay-prod --tail=100

# 2. Rollback to previous version
kubectl rollout undo deployment/backend -n flowpay-prod

# 3. Verify status
kubectl rollout status deployment/backend -n flowpay-prod

# 4. If still failing, check events
kubectl describe pod POD_NAME -n flowpay-prod
```

**RTO: 5 minutes | RPO: Previous deployment**

### Scenario 4: Data Corruption

**Detection**:
```bash
# Run data integrity checks
SELECT COUNT(*) FROM payments WHERE amount < 0;  -- Should be 0

# Alert if corruption detected
```

**Recovery**:
```bash
# 1. Stop write operations
kubectl scale deployment/backend --replicas=0 -n flowpay-prod

# 2. Restore from clean backup
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier flowpay-prod-clean \
  --db-snapshot-identifier flowpay-prod-daily-20240114

# 3. Run data validation
yarn prisma validate

# 4. Resume operations
kubectl scale deployment/backend --replicas=3 -n flowpay-prod
```

**RTO: 1 hour | RPO: Previous day's backup**

## Disaster Recovery Testing

### Monthly Failover Test

```bash
#!/bin/bash
# scripts/dr-test.sh

echo "Starting DR test at $(date)"

# 1. Create test database from snapshot
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier flowpay-prod-test \
  --db-snapshot-identifier flowpay-prod-daily-$(date -d "1 day ago" +%Y%m%d) \
  --db-instance-class db.t3.micro

# 2. Wait for restoration
aws rds wait db-instance-available \
  --db-instance-identifier flowpay-prod-test

# 3. Run data validation tests
node -e "
  const db = require('./database');
  const tests = require('./tests/dr-validation');
  tests.runAll(db);
"

# 4. Generate report
echo "DR Test Results:" > dr-test-report.txt
echo "Date: $(date)" >> dr-test-report.txt
echo "Status: PASS/FAIL" >> dr-test-report.txt

# 5. Cleanup
aws rds delete-db-instance \
  --db-instance-identifier flowpay-prod-test \
  --skip-final-snapshot

echo "DR test completed at $(date)"
```

### Quarterly Full Restoration Test

```bash
# 1. Create new VPC
aws ec2 create-vpc --cidr-block 10.1.0.0/16

# 2. Restore all infrastructure
kubectl create namespace flowpay-test
# Apply all manifests to test namespace

# 3. Run end-to-end tests
yarn test:e2e

# 4. Document findings
# Create incident report for any issues found

# 5. Cleanup
aws ec2 delete-vpc --vpc-id vpc-xxxxx
kubectl delete namespace flowpay-test
```

## Incident Response

### During Incident

```bash
# 1. Declare incident
# Create incident ticket with timestamp

# 2. Assemble team
# Notify on-call engineer, DBA, DevOps

# 3. Assess impact
kubectl get pods -n flowpay-prod
aws rds describe-db-instances \
  --db-instance-identifier flowpay-prod \
  --query 'DBInstances[0]'

# 4. Implement recovery
# Follow scenario-specific recovery steps

# 5. Communicate status
# Post updates to status page every 15 minutes
```

### Post-Incident

```bash
# 1. Root cause analysis
# Document what happened and why

# 2. Action items
# Create tickets for preventive measures

# 3. Update runbooks
# Incorporate lessons learned

# 4. Blameless review
# Scheduled within 48 hours
```

## Runbooks

### API Backend Restart

```bash
kubectl rollout restart deployment/backend -n flowpay-prod
kubectl rollout status deployment/backend -n flowpay-prod
```

### Database Connection Reset

```bash
# Kill stale connections
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = 'flowpay' AND pid <> pg_backend_pid();

# Verify connections reset
SELECT count(*) FROM pg_stat_activity WHERE datname = 'flowpay';
```

### Cache Clear

```bash
kubectl exec -it redis-0 -n flowpay-prod -- redis-cli FLUSHALL
```

## Backup Verification

```bash
# Monthly backup verification
aws rds describe-db-snapshots \
  --query 'DBSnapshots[0]' \
  --output table

# Verify backup retention policy
aws rds describe-db-instances \
  --db-instance-identifier flowpay-prod \
  --query 'DBInstances[0].[BackupRetentionPeriod,PreferredBackupWindow]'

# Test restore ability (quarterly)
# See Disaster Recovery Testing section
```

## Best Practices

✅ **Do:**
- Test backups regularly
- Document recovery procedures
- Maintain runbooks
- Communicate during incidents
- Review incidents blameless
- Automate backups
- Monitor backup status
- Keep off-site backups

❌ **Don't:**
- Skip DR testing
- Assume backups work
- Document procedures only once
- Blame individuals
- Ignore warning signs
- Keep all backups in one region
- Forget to test restore
- Skip post-mortems

## Contact Information

**On-Call Rotation:**
- Primary: ops@flowpay.stellar
- Secondary: backup@flowpay.stellar
- Manager: manager@flowpay.stellar

**Status Page:**
- https://status.flowpay.stellar

## Resources

- [AWS Disaster Recovery](https://aws.amazon.com/disaster-recovery/)
- [Kubernetes Backup](https://kubernetes.io/docs/tasks/administer-cluster/configure-upgrade-etcd/)
- [NIST Contingency Planning](https://nvlpubs.nist.gov/nistpubs/Legacy/SP/nistspecialpublication800-34r1.pdf)
