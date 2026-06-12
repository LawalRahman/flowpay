# Feature Flags & Rollouts

Progressive rollout and feature flag management.

## Overview

Feature flags enable safe, gradual feature deployment to production.

## Flag Service

```typescript
export enum FlagContext {
  USER = 'user',
  TENANT = 'tenant',
  PERCENTAGE = 'percentage'
}

export interface FeatureFlag {
  name: string;
  enabled: boolean;
  context: FlagContext;
  percentage?: number;
  targetIds?: string[];
  rules?: Rule[];
}

export interface Rule {
  condition: (context: any) => boolean;
  enabled: boolean;
}

@Injectable()
export class FeatureFlagService {
  private flags: Map<string, FeatureFlag> = new Map();

  constructor(private configService: ConfigService) {
    this.loadFlags();
  }

  isEnabled(
    flagName: string,
    context?: { userId?: string; tenantId?: string }
  ): boolean {
    const flag = this.flags.get(flagName);

    if (!flag) {
      return false;
    }

    if (!flag.enabled) {
      return false;
    }

    // Check context-based rules
    if (context?.userId && flag.targetIds?.includes(context.userId)) {
      return true;
    }

    if (flag.context === FlagContext.PERCENTAGE) {
      return this.checkPercentage(context?.userId || '', flag.percentage || 0);
    }

    // Check custom rules
    if (flag.rules) {
      return flag.rules.some(rule => rule.enabled && rule.condition(context));
    }

    return true;
  }

  private checkPercentage(userId: string, percentage: number): boolean {
    const hash = this.simpleHash(userId);
    return (hash % 100) < percentage;
  }

  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
    }
    return Math.abs(hash);
  }

  private loadFlags() {
    // Load from database or config
  }
}
```

## Decorator Usage

```typescript
export function FeatureGated(flagName: string) {
  return function(
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function(...args: any[]) {
      const context = args[args.length - 1]?.user || {};
      
      if (!this.featureFlagService.isEnabled(flagName, context)) {
        throw new HttpException(
          'Feature not available',
          HttpStatus.FORBIDDEN
        );
      }

      return originalMethod.apply(this, args);
    };

    return descriptor;
  };
}

@Controller('api')
export class ApiController {
  @Get('v2/payments')
  @FeatureGated('payments-v2-api')
  async getPaymentsV2() {
    // New implementation
  }
}
```

## Gradual Rollout

```typescript
@Injectable()
export class RolloutService {
  async rolloutFeature(
    flagName: string,
    stage: 'development' | 'staging' | 'canary' | 'production'
  ) {
    const percentage = {
      development: 100,
      staging: 100,
      canary: 10,
      production: 0
    }[stage];

    const flag = {
      name: flagName,
      enabled: true,
      context: FlagContext.PERCENTAGE,
      percentage
    };

    // Save flag
    await this.updateFlag(flag);

    // Log rollout
    this.logger.log(`Rolling out ${flagName} to ${percentage}% in ${stage}`);

    // Monitor metrics
    this.startMonitoring(flagName);
  }

  async increaseRollout(flagName: string, byPercentage: number) {
    const flag = await this.getFlag(flagName);
    flag.percentage = Math.min(100, (flag.percentage || 0) + byPercentage);
    await this.updateFlag(flag);

    this.logger.log(`Increased ${flagName} rollout to ${flag.percentage}%`);
  }

  async rollbackFeature(flagName: string) {
    const flag = await this.getFlag(flagName);
    flag.enabled = false;
    await this.updateFlag(flag);

    this.logger.warn(`Rolled back feature ${flagName}`);
  }
}
```

## Monitoring

```typescript
@Injectable()
export class FlagMonitoring {
  private featureErrorRate = new Gauge({
    name: 'feature_flag_error_rate',
    help: 'Error rate for feature',
    labelNames: ['flag_name']
  });

  async monitorFeature(flagName: string) {
    // Track errors for this feature
    setInterval(async () => {
      const errorRate = await this.calculateErrorRate(flagName);
      this.featureErrorRate.labels(flagName).set(errorRate);

      // Auto-rollback if error rate too high
      if (errorRate > 0.05) { // 5% threshold
        this.logger.error(`High error rate for ${flagName}, rolling back`);
        await this.rolloutService.rollbackFeature(flagName);
      }
    }, 60000); // Check every minute
  }

  private async calculateErrorRate(flagName: string): Promise<number> {
    // Calculate error rate from logs
    return 0;
  }
}
```

## A/B Testing

```typescript
@Injectable()
export class ABTestService {
  async runABTest(
    testName: string,
    variantA: string,
    variantB: string,
    sampleSize: number = 0.5
  ) {
    const test: ABTest = {
      name: testName,
      variantA,
      variantB,
      sampleSize,
      startDate: new Date(),
      results: { a: 0, b: 0 }
    };

    await this.saveTest(test);
  }

  getVariant(testName: string, userId: string): string {
    const test = this.getTest(testName);
    const hash = this.hashUserId(userId);
    
    return hash < test.sampleSize * 100 ? test.variantA : test.variantB;
  }

  async getResults(testName: string): Promise<ABTestResults> {
    const test = await this.getTest(testName);
    const conversions = await this.getConversions(testName);

    return {
      variantA: {
        conversions: conversions.a,
        conversionRate: conversions.a / test.results.a
      },
      variantB: {
        conversions: conversions.b,
        conversionRate: conversions.b / test.results.b
      },
      winner: conversions.a > conversions.b ? 'A' : 'B',
      significance: this.calculateSignificance(conversions)
    };
  }

  private hashUserId(userId: string): number {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      hash = ((hash << 5) - hash) + userId.charCodeAt(i);
    }
    return Math.abs(hash) % 100;
  }

  private calculateSignificance(results: any): number {
    // Chi-square test
    return 0.95; // Placeholder
  }
}
```

## Database Schema

```typescript
@Entity()
export class FeatureFlag {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  description: string;

  @Column({ default: false })
  enabled: boolean;

  @Column('jsonb')
  config: Record<string, any>;

  @Column('enum', { enum: FlagContext })
  context: FlagContext;

  @Column('int', { nullable: true })
  rolloutPercentage: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ nullable: true })
  createdBy: string;

  @Column({ nullable: true })
  updatedBy: string;
}

@Entity()
export class FlagAudit {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  flagId: string;

  @Column()
  action: 'created' | 'updated' | 'enabled' | 'disabled';

  @Column('jsonb')
  changes: Record<string, any>;

  @Column()
  changedBy: string;

  @CreateDateColumn()
  changedAt: Date;
}
```

## CLI Management

```bash
# Create flag
yarn flags:create --name "new-feature" --description "New feature description"

# Enable flag
yarn flags:enable --name "new-feature"

# Set rollout percentage
yarn flags:set-rollout --name "new-feature" --percentage 50

# List all flags
yarn flags:list

# Get flag status
yarn flags:status --name "new-feature"

# Rollback
yarn flags:disable --name "new-feature"
```

## Best Practices

✅ **Do:**
- Test with feature flags
- Monitor rollouts
- Gradual deployment
- Keep flags documented
- Clean up old flags
- Use consistent naming
- Monitor error rates
- Record decisions

❌ **Don't:**
- Deploy to 100% immediately
- Forget to clean up
- Hardcode flags
- Skip monitoring
- Use confusing names
- Leave dead code
- Ignore error rates
- Rush rollouts

## Resources

- [LaunchDarkly Feature Flags](https://launchdarkly.com/)
- [Feature Flag Patterns](https://martinfowler.com/articles/feature-toggles.html)
