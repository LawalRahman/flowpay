# Compliance & Audit Logging

Complete guide for compliance and audit logging in FlowPay.

## Overview

Comprehensive audit logging ensures regulatory compliance and security accountability.

## Audit Log Entity

```typescript
@Entity()
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @Column('uuid')
  tenantId: string;

  @Column()
  action: string; // 'CREATE', 'UPDATE', 'DELETE', 'VIEW'

  @Column()
  resource: string; // 'payment', 'workflow', 'user'

  @Column('uuid', { nullable: true })
  resourceId: string;

  @Column('jsonb')
  changes: {
    before?: any;
    after?: any;
  };

  @Column()
  ipAddress: string;

  @Column()
  userAgent: string;

  @Column('jsonb', { nullable: true })
  metadata?: Record<string, any>;

  @Column('enum', { enum: ['SUCCESS', 'FAILURE'] })
  status: 'SUCCESS' | 'FAILURE';

  @Column({ nullable: true })
  errorMessage?: string;

  @CreateDateColumn()
  timestamp: Date;

  @Index()
  @Column('uuid')
  correlationId: string;
}
```

## Audit Service

```typescript
@Injectable()
export class AuditService {
  private logger = new Logger(AuditService.name);

  constructor(
    private auditLogRepository: Repository<AuditLog>,
    private request: Request
  ) {}

  async log(
    userId: string,
    tenantId: string,
    action: string,
    resource: string,
    resourceId: string,
    changes?: { before?: any; after?: any },
    metadata?: Record<string, any>
  ): Promise<void> {
    const auditLog = this.auditLogRepository.create({
      userId,
      tenantId,
      action,
      resource,
      resourceId,
      changes,
      ipAddress: this.getClientIp(),
      userAgent: this.request.get('user-agent'),
      metadata,
      status: 'SUCCESS',
      correlationId: this.request.get('x-correlation-id') || randomUUID(),
      timestamp: new Date()
    });

    try {
      await this.auditLogRepository.save(auditLog);
    } catch (error) {
      this.logger.error(`Failed to save audit log: ${error.message}`);
      // Still log to console as fallback
      console.error('AUDIT_LOG_FAILED', auditLog);
    }
  }

  async logFailure(
    userId: string,
    tenantId: string,
    action: string,
    resource: string,
    error: Error,
    metadata?: Record<string, any>
  ): Promise<void> {
    const auditLog = this.auditLogRepository.create({
      userId,
      tenantId,
      action,
      resource,
      ipAddress: this.getClientIp(),
      userAgent: this.request.get('user-agent'),
      status: 'FAILURE',
      errorMessage: error.message,
      metadata,
      correlationId: this.request.get('x-correlation-id') || randomUUID(),
      timestamp: new Date()
    });

    await this.auditLogRepository.save(auditLog);
  }

  private getClientIp(): string {
    const forwardedFor = this.request.get('x-forwarded-for');
    return forwardedFor ? forwardedFor.split(',')[0].trim() : this.request.ip;
  }

  async query(filters: {
    userId?: string;
    tenantId?: string;
    resource?: string;
    action?: string;
    startDate?: Date;
    endDate?: Date;
    status?: 'SUCCESS' | 'FAILURE';
  }): Promise<AuditLog[]> {
    const query = this.auditLogRepository.createQueryBuilder('audit');

    if (filters.userId) {
      query.andWhere('audit.userId = :userId', { userId: filters.userId });
    }

    if (filters.tenantId) {
      query.andWhere('audit.tenantId = :tenantId', { tenantId: filters.tenantId });
    }

    if (filters.resource) {
      query.andWhere('audit.resource = :resource', { resource: filters.resource });
    }

    if (filters.action) {
      query.andWhere('audit.action = :action', { action: filters.action });
    }

    if (filters.status) {
      query.andWhere('audit.status = :status', { status: filters.status });
    }

    if (filters.startDate) {
      query.andWhere('audit.timestamp >= :startDate', { startDate: filters.startDate });
    }

    if (filters.endDate) {
      query.andWhere('audit.timestamp <= :endDate', { endDate: filters.endDate });
    }

    return query.orderBy('audit.timestamp', 'DESC').getMany();
  }
}
```

## Interceptor for Automatic Logging

```typescript
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { user, tenantId } = request;
    const { method, url } = request;

    const startTime = Date.now();
    const correlationId = request.get('x-correlation-id') || randomUUID();
    request.correlationId = correlationId;

    return next.handle().pipe(
      tap((response) => {
        const duration = Date.now() - startTime;
        this.logAction(user, tenantId, method, url, response, duration);
      }),
      catchError((error) => {
        const duration = Date.now() - startTime;
        this.auditService.logFailure(
          user?.id,
          tenantId,
          method,
          url,
          error,
          { duration }
        );
        throw error;
      })
    );
  }

  private logAction(
    user: any,
    tenantId: string,
    method: string,
    url: string,
    response: any,
    duration: number
  ) {
    const [resource, action] = this.parseRequest(method, url);

    this.auditService.log(
      user?.id,
      tenantId,
      action,
      resource,
      null,
      null,
      { duration, url }
    );
  }

  private parseRequest(method: string, url: string) {
    // Extract resource and action from URL
    // POST /payments -> resource: 'payment', action: 'CREATE'
    // GET /payments/:id -> resource: 'payment', action: 'VIEW'
    // etc.
    
    const parts = url.split('/').filter(p => p);
    const resource = parts[1]?.replace(/s$/, '') || 'unknown';
    const action = {
      'POST': 'CREATE',
      'GET': 'VIEW',
      'PUT': 'UPDATE',
      'PATCH': 'UPDATE',
      'DELETE': 'DELETE'
    }[method] || 'UNKNOWN';

    return [resource, action];
  }
}
```

## Compliance Decorators

```typescript
export function RequiresAudit(action: string, resource: string) {
  return function(
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function(...args: any[]) {
      const auditService = this.auditService;
      const request = args[args.length - 1]; // Last argument is usually the request

      try {
        const result = await originalMethod.apply(this, args);
        await auditService.log(
          request.user?.id,
          request.tenantId,
          action,
          resource,
          result?.id,
          { after: result }
        );
        return result;
      } catch (error) {
        await auditService.logFailure(
          request.user?.id,
          request.tenantId,
          action,
          resource,
          error
        );
        throw error;
      }
    };

    return descriptor;
  };
}

export function SensitiveData() {
  return function(
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function(...args: any[]) {
      console.warn(
        `SENSITIVE_DATA_ACCESS: ${target.constructor.name}.${propertyKey}`
      );
      return originalMethod.apply(this, args);
    };

    return descriptor;
  };
}
```

## Audit Report Generation

```typescript
@Injectable()
export class AuditReportService {
  constructor(private auditLogRepository: Repository<AuditLog>) {}

  async generateComplianceReport(
    tenantId: string,
    startDate: Date,
    endDate: Date
  ): Promise<ComplianceReport> {
    const logs = await this.auditLogRepository.find({
      where: {
        tenantId,
        timestamp: Between(startDate, endDate)
      }
    });

    return {
      tenantId,
      period: { startDate, endDate },
      totalEvents: logs.length,
      successfulEvents: logs.filter(l => l.status === 'SUCCESS').length,
      failedEvents: logs.filter(l => l.status === 'FAILURE').length,
      eventsByAction: this.groupByAction(logs),
      eventsByResource: this.groupByResource(logs),
      topUsers: this.getTopUsers(logs),
      suspiciousActivity: this.detectSuspiciousActivity(logs),
      generatedAt: new Date()
    };
  }

  private groupByAction(logs: AuditLog[]): Record<string, number> {
    return logs.reduce((acc, log) => {
      acc[log.action] = (acc[log.action] || 0) + 1;
      return acc;
    }, {});
  }

  private groupByResource(logs: AuditLog[]): Record<string, number> {
    return logs.reduce((acc, log) => {
      acc[log.resource] = (acc[log.resource] || 0) + 1;
      return acc;
    }, {});
  }

  private getTopUsers(logs: AuditLog[]): Array<{ userId: string; count: number }> {
    const counts = logs.reduce((acc, log) => {
      acc[log.userId] = (acc[log.userId] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(counts)
      .map(([userId, count]) => ({ userId, count: count as number }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  private detectSuspiciousActivity(logs: AuditLog[]): any[] {
    const suspicions: any[] = [];

    // Multiple failed login attempts
    const failedLogins = logs.filter(
      l => l.action === 'LOGIN' && l.status === 'FAILURE'
    );
    const userFailureMap = failedLogins.reduce((acc, log) => {
      acc[log.userId] = (acc[log.userId] || 0) + 1;
      return acc;
    }, {});

    Object.entries(userFailureMap).forEach(([userId, count]) => {
      if (count > 5) {
        suspicions.push({
          type: 'MULTIPLE_FAILED_LOGINS',
          userId,
          count
        });
      }
    });

    // Unusual data access patterns
    const dataAccessLogs = logs.filter(l => l.action === 'VIEW');
    if (dataAccessLogs.length > logs.length * 0.8) {
      suspicions.push({
        type: 'UNUSUAL_DATA_ACCESS',
        percentage: (dataAccessLogs.length / logs.length) * 100
      });
    }

    return suspicions;
  }
}
```

## Data Retention Policy

```typescript
@Injectable()
export class AuditRetentionService implements OnModuleInit {
  constructor(private auditLogRepository: Repository<AuditLog>) {}

  async onModuleInit() {
    // Run retention policy daily
    setInterval(() => this.enforceRetentionPolicy(), 24 * 60 * 60 * 1000);
  }

  async enforceRetentionPolicy(): Promise<void> {
    const retentionDays = 90; // Keep logs for 90 days
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const result = await this.auditLogRepository.delete({
      timestamp: LessThan(cutoffDate)
    });

    console.log(`Deleted ${result.affected} expired audit logs`);
  }

  async archiveOldLogs(beforeDate: Date): Promise<void> {
    const logs = await this.auditLogRepository.find({
      where: { timestamp: LessThan(beforeDate) }
    });

    // Archive to cold storage (S3, etc.)
    // await archiveToS3(logs);

    // Delete from active database
    await this.auditLogRepository.delete({
      timestamp: LessThan(beforeDate)
    });
  }
}
```

## Best Practices

✅ **Do:**
- Log all critical actions
- Include user identity
- Record changes (before/after)
- Monitor audit logs
- Archive old logs
- Detect anomalies
- Verify integrity
- Test audit functionality

❌ **Don't:**
- Log sensitive data (passwords, tokens)
- Skip audit logging
- Trust user-provided data
- Ignore log tampering
- Delete logs without archiving
- Log excessive detail
- Ignore suspicious patterns

## Compliance Standards

- **GDPR**: Right to access audit logs
- **HIPAA**: PHI audit requirements
- **SOC 2**: Audit logging controls
- **PCI DSS**: Payment transaction logs
- **ISO 27001**: Information security logs

## Resources

- [OWASP Logging Guide](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html)
- [Compliance Requirements](https://www.ncsc.gov.uk/collection/mobile-device-guidance)
