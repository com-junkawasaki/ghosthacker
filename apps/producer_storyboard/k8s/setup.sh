#!/bin/bash
set -e

echo "🚀 Setting up Producer Storyboard on Kubernetes with Scaffold + Helm"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if kubectl is available
if ! command -v kubectl &> /dev/null; then
    echo -e "${YELLOW}kubectl not found. Please install kubectl.${NC}"
    exit 1
fi

# Check if helm is available
if ! command -v helm &> /dev/null; then
    echo -e "${YELLOW}helm not found. Installing Helm...${NC}"
    curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
fi

# Check if OrbStack/Kubernetes is running
if ! kubectl cluster-info &> /dev/null; then
    echo -e "${YELLOW}Kubernetes cluster not accessible.${NC}"
    echo -e "${YELLOW}Please ensure OrbStack is running and Kubernetes is enabled.${NC}"
    echo ""
    echo "Steps to enable Kubernetes in OrbStack:"
    echo "  1. Open OrbStack Settings"
    echo "  2. Go to Kubernetes section"
    echo "  3. Enable Kubernetes"
    echo "  4. Wait for cluster to be ready"
    exit 1
fi

CLUSTER_INFO=$(kubectl cluster-info | head -n 1)
echo -e "${GREEN}✓ Kubernetes cluster is accessible${NC}"
echo -e "${BLUE}  ${CLUSTER_INFO}${NC}"

# Create namespace
NAMESPACE="producer-storyboard"
echo -e "${BLUE}Creating namespace: ${NAMESPACE}${NC}"
kubectl create namespace ${NAMESPACE} --dry-run=client -o yaml | kubectl apply -f -

# Check if Temporal is already running
if kubectl get svc temporal -n wdc-system &>/dev/null; then
    echo -e "${GREEN}✓ Found existing Temporal service in wdc-system namespace${NC}"
    TEMPORAL_NAMESPACE="wdc-system"
    TEMPORAL_ADDRESS="temporal.wdc-system.svc.cluster.local:7233"
else
    # Install Scaffold (Temporal Kubernetes Operator) - using temporal-operator instead
    echo -e "${BLUE}Installing Temporal Operator...${NC}"
    
    # Install cert-manager first (required by temporal-operator)
    kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.10.1/cert-manager.yaml || {
        echo -e "${YELLOW}Warning: cert-manager may already be installed${NC}"
    }
    
    # Wait for cert-manager to be ready
    kubectl wait --for=condition=ready pod -l app.kubernetes.io/instance=cert-manager -n cert-manager --timeout=120s || true
    
    # Install Temporal Operator CRDs
    kubectl apply --server-side -f https://github.com/alexandrevilain/temporal-operator/releases/latest/download/temporal-operator.crds.yaml || {
        echo -e "${YELLOW}Warning: Temporal Operator CRDs may already be installed${NC}"
    }
    
    # Install Temporal Operator
    kubectl apply -f https://github.com/alexandrevilain/temporal-operator/releases/latest/download/temporal-operator.yaml || {
        echo -e "${YELLOW}Warning: Temporal Operator may already be installed${NC}"
    }
    
    TEMPORAL_NAMESPACE="temporal-system"
    TEMPORAL_ADDRESS="temporal-frontend.temporal-system.svc.cluster.local:7233"
    
    # Create temporal-system namespace for Temporal cluster
    echo -e "${BLUE}Creating temporal-system namespace...${NC}"
    kubectl create namespace temporal-system --dry-run=client -o yaml | kubectl apply -f -
fi

# Build Docker images (if needed)
echo -e "${BLUE}Building Docker images...${NC}"
cd "$(dirname "$0")/.."

# Build grpc-go image
echo -e "${BLUE}Building grpc-go image...${NC}"
docker build -t producer-storyboard/grpc-go:latest \
    --target production \
    -f performers/services/grpc-go/Dockerfile \
    performers/services/grpc-go/ || {
    echo -e "${YELLOW}Warning: Failed to build grpc-go image. Continuing anyway...${NC}"
}

# Build temporal-worker image
if [ -f "performers/services/grpc-go/Dockerfile.worker" ]; then
    echo -e "${BLUE}Building temporal-worker image...${NC}"
    docker build -t producer-storyboard/temporal-worker:latest \
        --target production \
        -f performers/services/grpc-go/Dockerfile.worker \
        performers/services/grpc-go/ || {
        echo -e "${YELLOW}Warning: Failed to build temporal-worker image. Continuing anyway...${NC}"
    }
fi

# Note: OrbStack uses containerd directly, so images are automatically available
# For other local clusters (kind, minikube), you may need to load images manually
echo -e "${GREEN}✓ Images built (OrbStack will use them automatically)${NC}"

# Install Helm dependencies
echo -e "${BLUE}Installing Helm dependencies...${NC}"
cd k8s/helm/producer-storyboard
helm dependency update

# Create secrets file from environment variables
echo -e "${BLUE}Creating secrets...${NC}"
cat > /tmp/secrets-values.yaml <<EOF
grpcGo:
  env:
    TEMPORAL_ADDRESS: ${TEMPORAL_ADDRESS:-temporal.wdc-system.svc.cluster.local:7233}
  secrets:
    OPENAI_API_KEY: ${OPENAI_API_KEY:-}
    HUME_API_KEY: ${HUME_API_KEY:-}
    SUNO_API_KEY: ${SUNO_API_KEY:-}
    RUNWAY_API_KEY: ${RUNWAY_API_KEY:-}
    HIGGSFIELD_API_KEY: ${HIGGSFIELD_API_KEY:-}
temporalWorker:
  env:
    TEMPORAL_ADDRESS: ${TEMPORAL_ADDRESS:-temporal.wdc-system.svc.cluster.local:7233}
  secrets:
    CLERK_SECRET_KEY: ${CLERK_SECRET_KEY:-}
postgresql:
  enabled: false
temporal:
  enabled: false
EOF

# Install the chart
echo -e "${BLUE}Installing Producer Storyboard Helm chart...${NC}"
helm upgrade --install producer-storyboard . \
    --namespace ${NAMESPACE} \
    --create-namespace \
    -f values.yaml \
    -f /tmp/secrets-values.yaml \
    --set postgresql.enabled=false \
    --set temporal.enabled=false \
    --set grpcGo.env.DATABASE_URL="postgresql://postgres:postgres@postgresql.wdc-system.svc.cluster.local:5432/postgres" \
    --set temporalWorker.env.DATABASE_URL="postgresql://postgres:postgres@postgresql.wdc-system.svc.cluster.local:5432/postgres"

# Wait for deployments to be ready
echo -e "${BLUE}Waiting for deployments to be ready...${NC}"
kubectl wait --for=condition=available deployment/producer-storyboard-grpc-go -n ${NAMESPACE} --timeout=300s || true
kubectl wait --for=condition=available deployment/producer-storyboard-temporal-worker -n ${NAMESPACE} --timeout=300s || true

echo -e "${GREEN}✓ Setup complete!${NC}"
echo ""
echo -e "${BLUE}Useful commands:${NC}"
echo "  kubectl get pods -n ${NAMESPACE}"
echo "  kubectl get svc -n ${NAMESPACE}"
echo "  kubectl logs -f deployment/producer-storyboard-grpc-go -n ${NAMESPACE}"
echo "  kubectl logs -f deployment/producer-storyboard-temporal-worker -n ${NAMESPACE}"
echo ""
echo -e "${BLUE}Temporal UI:${NC}"
echo "  kubectl port-forward -n temporal-system svc/temporal-frontend 7233:7233"
echo "  kubectl port-forward -n temporal-system svc/temporal-ui 8080:8080"
echo "  Then visit: http://localhost:8080"
