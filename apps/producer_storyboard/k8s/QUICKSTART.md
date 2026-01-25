# Quick Start: Kubernetes Setup on OrbStack

This guide will help you set up Producer Storyboard on Kubernetes using OrbStack, Scaffold (Temporal Operator), and Helm.

## Prerequisites

1. **OrbStack** installed and running
2. **Kubernetes enabled** in OrbStack:
   - Open OrbStack Settings
   - Go to Kubernetes section
   - Enable Kubernetes
   - Wait for cluster to be ready (check status in OrbStack)

3. **kubectl** (usually comes with OrbStack)
4. **Helm 3.x** installed
5. **Docker** (for building images)

## Option 1: Skaffold (推奨 - 開発用)

Skaffoldを使用すると、コード変更の自動ビルド・デプロイが可能です。

### インストール

```bash
# macOS
brew install skaffold

# Linux/Windows
curl -Lo skaffold https://storage.googleapis.com/skaffold/releases/latest/skaffold-linux-amd64
sudo install skaffold /usr/local/bin/
```

### 開発モードで起動

```bash
# 環境変数を設定（.envrcまたはexport）
export OPENAI_API_KEY=your_key
export HUME_API_KEY=your_key
export SUNO_API_KEY=your_key
export RUNWAY_API_KEY=your_key
export HIGGSFIELD_API_KEY=your_key
export CLERK_SECRET_KEY=your_key

# 開発モードで起動（ホットリロード有効）
make skaffold-dev
# または
skaffold dev --profile dev
```

Skaffoldが以下を自動的に実行します:
- ✅ Scaffold Operatorのインストール
- ✅ PostgreSQLのデプロイ
- ✅ Temporalクラスターの作成
- ✅ アプリケーションのビルド＆デプロイ
- ✅ ポートフォワード（8081, 8080, 7233）
- ✅ ログストリーミング

詳細は [SKAFFOLD.md](../SKAFFOLD.md) を参照してください。

## Option 2: Helm + Setup Script

### Step 1: Verify Kubernetes Cluster

```bash
# Check if cluster is accessible
kubectl cluster-info

# Should show something like:
# Kubernetes control plane is running at https://127.0.0.1:6443
```

### Step 2: Set Environment Variables

Create a `.env` file or export variables:

```bash
export OPENAI_API_KEY=your_openai_key
export HUME_API_KEY=your_hume_key
export SUNO_API_KEY=your_suno_key
export RUNWAY_API_KEY=your_runway_key
export HIGGSFIELD_API_KEY=your_higgsfield_key
export CLERK_SECRET_KEY=your_clerk_secret_key
```

### Step 3: Run Setup Script

```bash
cd k8s
./setup.sh
```

The script will:
1. ✅ Check prerequisites
2. ✅ Install Scaffold (Temporal Kubernetes Operator)
3. ✅ Create namespaces
4. ✅ Build Docker images
5. ✅ Install Helm chart with all dependencies

## Step 4: Verify Installation

```bash
# Check pods
kubectl get pods -n producer-storyboard
kubectl get pods -n temporal-system

# Check services
kubectl get svc -n producer-storyboard
kubectl get svc -n temporal-system

# Check Temporal cluster
kubectl get temporalcluster -n temporal-system
```

## Step 5: Access Services

### Port Forwarding

```bash
# gRPC Service
kubectl port-forward -n producer-storyboard svc/producer-storyboard-grpc-go 8081:8081

# Temporal Frontend (for workers)
kubectl port-forward -n temporal-system svc/temporal-frontend 7233:7233

# Temporal UI (web interface)
kubectl port-forward -n temporal-system svc/temporal-ui 8080:8080
```

Then access:
- **Temporal UI**: http://localhost:8080
- **gRPC API**: http://localhost:8081

## Troubleshooting

### Pods Not Starting

```bash
# Check pod status
kubectl describe pod <pod-name> -n producer-storyboard

# Check logs
kubectl logs <pod-name> -n producer-storyboard

# Check events
kubectl get events -n producer-storyboard --sort-by='.lastTimestamp'
```

### Image Pull Errors

If using local images, make sure they're loaded:

```bash
# Build images
docker build -t producer-storyboard/grpc-go:latest -f ../performers/services/grpc-go/Dockerfile ../performers/services/grpc-go/
docker build -t producer-storyboard/temporal-worker:latest -f ../performers/services/grpc-go/Dockerfile.worker ../performers/services/grpc-go/

# For OrbStack/Kind, images should be available automatically
# If not, you may need to push to a registry
```

### Temporal Connection Issues

```bash
# Check Temporal cluster status
kubectl get temporalcluster -n temporal-system

# Check Temporal services
kubectl get svc -n temporal-system

# Check Temporal pods
kubectl get pods -n temporal-system
```

## Next Steps

- See [README.md](./README.md) for detailed documentation
- See [SKAFFOLD.md](../SKAFFOLD.md) for Skaffold usage
- Configure Ingress for external access
- Set up monitoring and logging
- Configure resource limits based on your needs

## Cleanup

To remove everything:

```bash
# Skaffoldを使用している場合
skaffold delete

# Helmを使用している場合
helm uninstall producer-storyboard -n producer-storyboard
kubectl delete namespace producer-storyboard
kubectl delete namespace temporal-system
kubectl delete -f https://github.com/temporalio/scaffold/releases/latest/download/scaffold.yaml
```
