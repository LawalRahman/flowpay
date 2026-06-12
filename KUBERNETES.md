# Kubernetes Deployment

Complete Kubernetes deployment guide for FlowPay.

## Overview

Kubernetes orchestration provides scalability, high availability, and automated management.

## Namespace

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: flowpay
  labels:
    name: flowpay
```

## ConfigMap

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: flowpay-config
  namespace: flowpay
data:
  NODE_ENV: production
  LOG_LEVEL: info
  STELLAR_NETWORK: testnet
  VITE_API_URL: https://api.flowpay.stellar
```

## Secrets

```bash
# Create secret
kubectl create secret generic flowpay-secrets \
  --from-literal=jwt-secret=your-secret \
  --from-literal=db-password=your-password \
  --from-literal=stellar-secret=your-stellar-secret \
  -n flowpay
```

## PostgreSQL StatefulSet

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
  namespace: flowpay
spec:
  serviceName: postgres
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
      - name: postgres
        image: postgres:15-alpine
        ports:
        - containerPort: 5432
        env:
        - name: POSTGRES_USER
          value: flowpay
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: flowpay-secrets
              key: db-password
        - name: POSTGRES_DB
          value: flowpay
        volumeMounts:
        - name: postgres-storage
          mountPath: /var/lib/postgresql/data
        livenessProbe:
          exec:
            command:
            - /bin/sh
            - -c
            - pg_isready -U flowpay
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          exec:
            command:
            - /bin/sh
            - -c
            - pg_isready -U flowpay
          initialDelaySeconds: 5
          periodSeconds: 10
  volumeClaimTemplates:
  - metadata:
      name: postgres-storage
    spec:
      accessModes: [ "ReadWriteOnce" ]
      storageClassName: standard
      resources:
        requests:
          storage: 10Gi
---
apiVersion: v1
kind: Service
metadata:
  name: postgres
  namespace: flowpay
spec:
  clusterIP: None
  selector:
    app: postgres
  ports:
  - port: 5432
    targetPort: 5432
```

## Redis StatefulSet

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: redis
  namespace: flowpay
spec:
  serviceName: redis
  replicas: 1
  selector:
    matchLabels:
      app: redis
  template:
    metadata:
      labels:
        app: redis
    spec:
      containers:
      - name: redis
        image: redis:7-alpine
        ports:
        - containerPort: 6379
        command:
        - redis-server
        - "--appendonly"
        - "yes"
        volumeMounts:
        - name: redis-storage
          mountPath: /data
        livenessProbe:
          exec:
            command:
            - redis-cli
            - ping
          initialDelaySeconds: 30
          periodSeconds: 10
  volumeClaimTemplates:
  - metadata:
      name: redis-storage
    spec:
      accessModes: [ "ReadWriteOnce" ]
      storageClassName: standard
      resources:
        requests:
          storage: 5Gi
---
apiVersion: v1
kind: Service
metadata:
  name: redis
  namespace: flowpay
spec:
  clusterIP: None
  selector:
    app: redis
  ports:
  - port: 6379
    targetPort: 6379
```

## Backend Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend
  namespace: flowpay
  labels:
    app: backend
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app: backend
  template:
    metadata:
      labels:
        app: backend
    spec:
      serviceAccountName: backend
      containers:
      - name: backend
        image: your-registry/flowpay-backend:latest
        imagePullPolicy: Always
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          valueFrom:
            configMapKeyRef:
              name: flowpay-config
              key: NODE_ENV
        - name: DATABASE_URL
          value: postgresql://flowpay:$(DB_PASSWORD)@postgres:5432/flowpay
        - name: DB_PASSWORD
          valueFrom:
            secretKeyRef:
              name: flowpay-secrets
              key: db-password
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: flowpay-secrets
              key: jwt-secret
        - name: REDIS_HOST
          value: redis
        - name: REDIS_PORT
          value: "6379"
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health/live
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 5
        securityContext:
          runAsNonRoot: true
          runAsUser: 1000
          allowPrivilegeEscalation: false
          readOnlyRootFilesystem: true
          capabilities:
            drop:
              - ALL
---
apiVersion: v1
kind: Service
metadata:
  name: backend
  namespace: flowpay
  labels:
    app: backend
spec:
  type: ClusterIP
  selector:
    app: backend
  ports:
  - protocol: TCP
    port: 3000
    targetPort: 3000
```

## Frontend Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontend
  namespace: flowpay
  labels:
    app: frontend
spec:
  replicas: 2
  selector:
    matchLabels:
      app: frontend
  template:
    metadata:
      labels:
        app: frontend
    spec:
      containers:
      - name: frontend
        image: your-registry/flowpay-frontend:latest
        imagePullPolicy: Always
        ports:
        - containerPort: 80
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "256Mi"
            cpu: "200m"
        livenessProbe:
          httpGet:
            path: /health
            port: 80
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /
            port: 80
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: frontend
  namespace: flowpay
spec:
  type: LoadBalancer
  selector:
    app: frontend
  ports:
  - protocol: TCP
    port: 80
    targetPort: 80
```

## Ingress

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: flowpay-ingress
  namespace: flowpay
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  ingressClassName: nginx
  tls:
  - hosts:
    - flowpay.stellar
    - api.flowpay.stellar
    secretName: flowpay-tls
  rules:
  - host: flowpay.stellar
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: frontend
            port:
              number: 80
  - host: api.flowpay.stellar
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: backend
            port:
              number: 3000
```

## HorizontalPodAutoscaler

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: backend-hpa
  namespace: flowpay
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: backend
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

## Deployment Commands

```bash
# Apply manifests
kubectl apply -f k8s/

# Check deployments
kubectl get deployments -n flowpay

# View pods
kubectl get pods -n flowpay

# View services
kubectl get svc -n flowpay

# Get deployment status
kubectl rollout status deployment/backend -n flowpay

# View logs
kubectl logs -n flowpay deployment/backend

# Scale deployment
kubectl scale deployment backend --replicas=5 -n flowpay

# Update image
kubectl set image deployment/backend \
  backend=your-registry/flowpay-backend:v1.0.1 \
  -n flowpay

# Rollback
kubectl rollout undo deployment/backend -n flowpay

# Delete namespace (cascades to all resources)
kubectl delete namespace flowpay
```

## Monitoring with Prometheus

```yaml
apiVersion: v1
kind: ServiceMonitor
metadata:
  name: backend
  namespace: flowpay
spec:
  selector:
    matchLabels:
      app: backend
  endpoints:
  - port: metrics
    interval: 30s
```

## Best Practices

✅ **Do:**
- Use namespaces for isolation
- Set resource requests/limits
- Use health checks
- Implement pod disruption budgets
- Use readiness probes
- Scale appropriately
- Monitor resource usage

❌ **Don't:**
- Run as root
- Use latest tags
- Ignore resource limits
- Skip health checks
- Use hardcoded values
- Run single replicas in production

## References

- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [Helm Package Manager](https://helm.sh/)
- [Kubernetes Best Practices](https://kubernetes.io/docs/concepts/configuration/overview/)
