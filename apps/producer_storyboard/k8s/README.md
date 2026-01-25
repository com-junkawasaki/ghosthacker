# Kubernetes Setup for Producer Storyboard

This directory contains Kubernetes manifests and Helm charts for deploying Producer Storyboard on OrbStack (or any Kubernetes cluster).

## Prerequisites

- **OrbStack** with Kubernetes enabled (or any Kubernetes cluster)
  - Open OrbStack Settings → Kubernetes → Enable Kubernetes
  - Wait for cluster to be ready (check status in OrbStack dashboard)
- **kubectl** (usually comes with OrbStack)
- **Helm 3.x** installed
- **Docker** (for building images)

### OrbStack Specific Notes

- OrbStack uses containerd directly, so Docker images built locally are automatically available to Kubernetes
- No need to load images into kind or other local clusters
- Kubernetes API server runs at `https://127.0.0.1:6443` by default

## Architecture

- **PostgreSQL**: Database (via Bitnami Helm chart)
- **Temporal**: Workflow orchestration (via Scaffold Kubernetes Operator)
- **gRPC Go Service**: Main API server
- **Temporal Worker**: Processes Temporal workflows

## Quick Start

### Option 1: Skaffold (推奨 - 開発用)

Skaffoldを使用すると、コード変更の自動ビルド・デプロイが可能です。

```bash
# Skaffoldをインストール
brew install skaffold  # macOS
# または https://skaffold.dev/docs/install/ を参照

# 開発モードで起動（ホットリロード有効）
skaffold dev --profile dev

# 本番モードでデプロイ
skaffold run
```

詳細は [SKAFFOLD.md](../SKAFFOLD.md) を参照してください。

### Option 2: Helm + Setup Script

### 1. Enable Kubernetes in OrbStack

1. Open OrbStack Settings
2. Go to Kubernetes section
3. Enable Kubernetes
4. Wait for cluster to be ready

### 2. Run Setup Script

```bash
# Set environment variables (optional, can also use .envrc)
export OPENAI_API_KEY=your_key_here
export HUME_API_KEY=your_key_here
export SUNO_API_KEY=your_key_here
export RUNWAY_API_KEY=your_key_here
export HIGGSFIELD_API_KEY=your_key_here
export CLERK_SECRET_KEY=your_key_here

# Run setup script
cd k8s
chmod +x setup.sh
./setup.sh
```

### 3. Manual Setup (Alternative)

If you prefer to set up manually:

```bash
# 1. Install Scaffold operator
kubectl apply -f https://github.com/temporalio/scaffold/releases/latest/download/scaffold.yaml

# 2. Create namespaces
kubectl create namespace producer-storyboard
kubectl create namespace temporal-system

# 3. Build and load images
docker build -t producer-storyboard/grpc-go:latest -f ../performers/services/grpc-go/Dockerfile ../performers/services/grpc-go/
docker build -t producer-storyboard/temporal-worker:latest -f ../performers/services/grpc-go/Dockerfile.worker ../performers/services/grpc-go/

# If using kind (for local testing)
kind load docker-image producer-storyboard/grpc-go:latest
kind load docker-image producer-storyboard/temporal-worker:latest

# 4. Install Helm chart
cd helm/producer-storyboard
helm dependency update
helm install producer-storyboard . \
    --namespace producer-storyboard \
    --create-namespace \
    --set grpcGo.secrets.OPENAI_API_KEY=your_key \
    --set grpcGo.secrets.HUME_API_KEY=your_key \
    # ... other secrets
```

## Helm Chart Structure

```
helm/
├── producer-storyboard/          # Main application chart
│   ├── Chart.yaml
│   ├── values.yaml
│   └── templates/
│       ├── grpc-go/
│       │   └── deployment.yaml
│       ├── temporal-worker/
│       │   └── deployment.yaml
│       └── secrets.yaml
└── temporal/                      # Temporal subchart (via Scaffold)
    ├── Chart.yaml
    ├── values.yaml
    └── templates/
        └── temporalcluster.yaml
```

## Configuration

### Values File

Edit `helm/producer-storyboard/values.yaml` to customize:

- Resource limits
- Replica counts
- Service types
- Environment variables

### Secrets

Secrets can be set via:

1. **Helm values** (not recommended for production):
   ```yaml
   grpcGo:
     secrets:
       OPENAI_API_KEY: "your-key"
   ```

2. **Kubernetes Secrets** (recommended):
   ```bash
   kubectl create secret generic producer-storyboard-secrets \
     --from-literal=openai-api-key=your-key \
     --from-literal=hume-api-key=your-key \
     -n producer-storyboard
   ```

3. **External secret management** (e.g., Sealed Secrets, External Secrets Operator)

## Accessing Services

### Port Forwarding

```bash
# gRPC Service
kubectl port-forward -n producer-storyboard svc/producer-storyboard-grpc-go 8081:8081

# Temporal Frontend
kubectl port-forward -n temporal-system svc/temporal-frontend 7233:7233

# Temporal UI
kubectl port-forward -n temporal-system svc/temporal-ui 8080:8080
```

### Ingress (Optional)

To expose services via Ingress, enable it in `values.yaml`:

```yaml
ingress:
  enabled: true
  className: "nginx"
  hosts:
    - host: producer-storyboard.local
      paths:
        - path: /
          pathType: Prefix
```

Then install an Ingress controller (e.g., NGINX Ingress):

```bash
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/cloud/deploy.yaml
```

## Monitoring

### Check Pod Status

```bash
kubectl get pods -n producer-storyboard
kubectl get pods -n temporal-system
```

### View Logs

```bash
# gRPC Service logs
kubectl logs -f deployment/producer-storyboard-grpc-go -n producer-storyboard

# Temporal Worker logs
kubectl logs -f deployment/producer-storyboard-temporal-worker -n producer-storyboard

# Temporal Server logs
kubectl logs -f -l app.kubernetes.io/component=frontend -n temporal-system
```

### Check Services

```bash
kubectl get svc -n producer-storyboard
kubectl get svc -n temporal-system
```

## Troubleshooting

### Pods Not Starting

1. Check pod status:
   ```bash
   kubectl describe pod <pod-name> -n producer-storyboard
   ```

2. Check logs:
   ```bash
   kubectl logs <pod-name> -n producer-storyboard
   ```

3. Check events:
   ```bash
   kubectl get events -n producer-storyboard --sort-by='.lastTimestamp'
   ```

### Image Pull Errors

If using local images with OrbStack/Kind:

```bash
# Load images into cluster
kind load docker-image producer-storyboard/grpc-go:latest
kind load docker-image producer-storyboard/temporal-worker:latest
```

Or use an image registry:

1. Push images to a registry (Docker Hub, GHCR, etc.)
2. Update `values.yaml` with registry URL:
   ```yaml
   grpcGo:
     image:
       repository: your-registry/producer-storyboard/grpc-go
   ```

### Temporal Connection Issues

1. Verify Temporal cluster is running:
   ```bash
   kubectl get temporalcluster -n temporal-system
   ```

2. Check Temporal services:
   ```bash
   kubectl get svc -n temporal-system | grep temporal
   ```

3. Verify connection string in gRPC service:
   ```bash
   kubectl get deployment producer-storyboard-grpc-go -n producer-storyboard -o yaml | grep TEMPORAL_ADDRESS
   ```

## Upgrading

```bash
cd helm/producer-storyboard
helm dependency update
helm upgrade producer-storyboard . -n producer-storyboard
```

## Uninstalling

```bash
helm uninstall producer-storyboard -n producer-storyboard
kubectl delete namespace producer-storyboard
kubectl delete namespace temporal-system
```

## References

- [Scaffold (Temporal Kubernetes Operator)](https://github.com/temporalio/scaffold)
- [Temporal Documentation](https://docs.temporal.io/)
- [Helm Documentation](https://helm.sh/docs/)
- [OrbStack Documentation](https://docs.orbstack.dev/)
