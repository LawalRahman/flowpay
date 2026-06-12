# Data Migration

Guide for data migration strategies and procedures.

## Overview

Safe data migration is critical for system upgrades and scaling.

## Migration Types

### Schema Migration (Liquibase/Flyway)

```sql
-- V1_0_0__Initial_schema.sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE payments (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  amount DECIMAL(18,8),
  status VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_payments_user_id ON payments(user_id);
```

```sql
-- V1_1_0__Add_workflow_tables.sql
CREATE TABLE workflows (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  name VARCHAR(255),
  status VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE payments ADD COLUMN workflow_id UUID REFERENCES workflows(id);
```

### Data Transformation

```typescript
@Injectable()
export class DataMigrationService {
  async migrateUserData() {
    // Get batch of unmigrated users
    const users = await this.getUsersToMigrate(1000);

    for (const user of users) {
      try {
        // Transform data
        const migratedUser = this.transformUserData(user);

        // Validate before saving
        await this.validateUser(migratedUser);

        // Save to new schema
        await this.saveMigratedUser(migratedUser);

        // Mark as migrated
        await this.markAsMigrated(user.id);
      } catch (error) {
        // Log error and continue
        this.logger.error(
          `Failed to migrate user ${user.id}: ${error.message}`
        );
        
        // Store for manual review
        await this.storeFailedMigration(user, error);
      }
    }
  }

  private transformUserData(user: any) {
    return {
      ...user,
      email: user.email.toLowerCase(),
      status: user.active ? 'active' : 'inactive',
      migratedAt: new Date()
    };
  }

  private async validateUser(user: any): Promise<void> {
    if (!user.email || !user.email.includes('@')) {
      throw new Error('Invalid email format');
    }

    const existing = await this.getUserByEmail(user.email);
    if (existing && existing.id !== user.id) {
      throw new Error('Email already exists');
    }
  }
}
```

### Database Replication

```typescript
@Injectable()
export class ReplicationService {
  async setupReplication() {
    // For PostgreSQL master-replica setup
    // Configure in postgresql.conf
    
    // Primary (Master)
    // wal_level = replica
    // max_wal_senders = 10
    // wal_keep_size = 1GB

    // Secondary (Replica)
    // primary_conninfo = 'host=primary_host port=5432 user=replication password=xyz'
    // recovery_target_timeline = 'latest'
  }

  async verifyReplication() {
    const rows = await this.db.query(
      'SELECT client_addr, backend_start FROM pg_stat_replication'
    );

    return rows.length > 0;
  }
}
```

## Migration Strategies

### Big Bang Migration

**Pros:**
- Simple to execute
- Clean cutover

**Cons:**
- High risk
- Long downtime
- Difficult rollback

```bash
#!/bin/bash
# big-bang-migration.sh

# 1. Backup production
pg_dump --verbose flowpay > flowpay-backup.sql

# 2. Maintenance mode
curl -X POST http://api.flowpay.stellar/admin/maintenance-mode

# 3. Stop all write operations
systemctl stop flowpay-api

# 4. Migrate data
psql flowpay < migration-script.sql

# 5. Verify data
psql flowpay -c "SELECT COUNT(*) FROM payments;"

# 6. Restart services
systemctl start flowpay-api

# 7. Exit maintenance mode
curl -X POST http://api.flowpay.stellar/admin/maintenance-mode --data '{"enabled":false}'
```

### Blue-Green Migration

**Pros:**
- Zero downtime
- Easy rollback
- Testing in production

**Cons:**
- Resource intensive
- Complex to manage

```bash
#!/bin/bash
# blue-green-migration.sh

# 1. Create "green" environment
kubectl create namespace flowpay-green

# 2. Copy current database
pg_dump flowpay | psql -h green-db.rds.amazonaws.com flowpay

# 3. Run migrations on green
flyway -url jdbc:postgresql://green-db/flowpay migrate

# 4. Validate green environment
./test/smoke-tests.sh green-api.flowpay.stellar

# 5. Switch load balancer
aws elb set-instance-health \
  --load-balancer-name flowpay-lb \
  --instances i-blue-instance1 \
  --state OutOfService

# 6. Monitor for issues
sleep 300

# 7. If successful, remove blue environment
kubectl delete namespace flowpay-blue
```

### Canary Migration

**Pros:**
- Gradual rollout
- Risk mitigation
- Easy rollback

**Cons:**
- Longer migration period
- More complex

```bash
#!/bin/bash
# canary-migration.sh

# 1. Create canary database
pg_dump flowpay | psql -h canary-db canary_flowpay

# 2. Run migrations
flyway -url jdbc:postgresql://canary-db/canary_flowpay migrate

# 3. Route 5% of traffic to canary
kubectl apply -f - <<EOF
apiVersion: networking.istio.io/v1alpha3
kind: VirtualService
metadata:
  name: flowpay
spec:
  hosts:
  - flowpay
  http:
  - match:
    - uri:
        regex: "^.*$"
    route:
    - destination:
        host: flowpay-v1
      weight: 95
    - destination:
        host: flowpay-canary
      weight: 5
EOF

# 4. Monitor canary metrics
watch -n 5 "kubectl logs -l version=canary"

# 5. Gradually increase traffic
kubectl patch vs flowpay --type merge \
  -p '{"spec":{"http":[{"route":[{"destination":{"host":"flowpay-v1"},"weight":80},{"destination":{"host":"flowpay-canary"},"weight":20}]}]}}'

# 6. Complete migration
kubectl patch vs flowpay --type merge \
  -p '{"spec":{"http":[{"route":[{"destination":{"host":"flowpay-canary"},"weight":100}]}]}}'
```

## Data Validation

```typescript
@Injectable()
export class DataValidationService {
  async validateMigration(
    sourceDb: DataSource,
    targetDb: DataSource
  ): Promise<ValidationResult> {
    const results: ValidationResult = {
      totalRecords: 0,
      matchedRecords: 0,
      missingRecords: [],
      invalidRecords: []
    };

    // Check row counts
    const sourceCount = await sourceDb.query(
      'SELECT COUNT(*) FROM payments'
    );
    const targetCount = await targetDb.query(
      'SELECT COUNT(*) FROM payments'
    );

    if (sourceCount[0].count !== targetCount[0].count) {
      throw new Error('Record count mismatch');
    }

    results.totalRecords = sourceCount[0].count;

    // Spot check random records
    const samples = await this.getSampleRecords(sourceDb, 100);

    for (const sample of samples) {
      const targetRecord = await targetDb.query(
        'SELECT * FROM payments WHERE id = $1',
        [sample.id]
      );

      if (targetRecord.length === 0) {
        results.missingRecords.push(sample.id);
      } else {
        if (this.validateRecord(sample, targetRecord[0])) {
          results.matchedRecords++;
        } else {
          results.invalidRecords.push(sample);
        }
      }
    }

    return results;
  }

  private validateRecord(source: any, target: any): boolean {
    return (
      source.id === target.id &&
      source.amount === target.amount &&
      source.user_id === target.user_id &&
      source.status === target.status
    );
  }
}
```

## Rollback Strategy

```bash
#!/bin/bash
# rollback-migration.sh

# 1. Detect issue
ALERT_THRESHOLD=0.05  # 5% error rate
ERROR_RATE=$(kubectl logs deployment/backend | grep ERROR | wc -l)

if (( $(echo "$ERROR_RATE > $ALERT_THRESHOLD" | bc -l) )); then
  echo "High error rate detected, initiating rollback"
  
  # 2. Stop new operations
  kubectl scale deployment/backend --replicas=0

  # 3. Restore from backup
  pg_restore --no-privileges -d flowpay backup_pre_migration.dump

  # 4. Verify restoration
  psql flowpay -c "SELECT COUNT(*) FROM payments;"

  # 5. Restart services
  kubectl scale deployment/backend --replicas=3

  # 6. Notify team
  echo "Rollback completed at $(date)" | mail -s "Migration Rollback" team@flowpay.stellar
fi
```

## Testing

```typescript
describe('Data Migration', () => {
  it('should migrate all user records', async () => {
    const sourceUsers = await source.query('SELECT COUNT(*) FROM users');
    const targetUsers = await target.query('SELECT COUNT(*) FROM users');

    expect(targetUsers[0].count).toBe(sourceUsers[0].count);
  });

  it('should maintain data integrity', async () => {
    const samples = await source.query(
      'SELECT * FROM payments ORDER BY RANDOM() LIMIT 100'
    );

    for (const sample of samples) {
      const migrated = await target.query(
        'SELECT * FROM payments WHERE id = $1',
        [sample.id]
      );

      expect(migrated[0]).toEqual(sample);
    }
  });

  it('should handle concurrent writes during migration', async () => {
    // Start migration
    const migration = migrationService.migrate();

    // Write new records
    await writeNewRecords(100);

    // Complete migration
    await migration;

    // Verify all records
    const totalRecords = await target.query('SELECT COUNT(*) FROM payments');
    expect(totalRecords[0].count).toBeGreaterThanOrEqual(100);
  });
});
```

## Best Practices

✅ **Do:**
- Test on staging first
- Back up before migrating
- Have rollback plan
- Monitor during migration
- Validate data integrity
- Document procedures
- Use version control
- Notify stakeholders

❌ **Don't:**
- Migrate without backup
- Skip testing
- Ignore validation
- Rush migrations
- Migrate during peak hours
- Skip documentation
- Forget rollback strategy
- Ignore edge cases

## Resources

- [Database Refactoring](https://databaserefactoring.com/)
- [PostgreSQL Replication](https://www.postgresql.org/docs/current/warm-standby.html)
- [Blue-Green Deployments](https://martinfowler.com/bliki/BlueGreenDeployment.html)
