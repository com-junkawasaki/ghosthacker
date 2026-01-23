#!/bin/bash

set -e

BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Setting up Storyboard Editor with Paketo + Scaffold...${NC}"

# Check prerequisites
echo -e "${BLUE}📋 Checking prerequisites...${NC}"

if ! command -v kubectl &> /dev/null; then
    echo -e "${RED}❌ kubectl is not installed${NC}"
    exit 1
fi

if ! command -v pack &> /dev/null; then
    echo -e "${YELLOW}⚠️  Paketo CLI (pack) is not installed. Installing...${NC}"
    if [[ "$OSTYPE" == "darwin"* ]]; then
        brew install buildpacks/tap/pack
    else
        echo "Please install pack CLI: https://buildpacks.io/docs/tools/pack/"
        exit 1
    fi
fi

# Check if Kubernetes cluster is accessible
if ! kubectl cluster-info &> /dev/null; then
    echo -e "${RED}❌ Cannot connect to Kubernetes cluster${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Prerequisites check passed${NC}"

# Install cert-manager (required by Scaffold)
echo -e "${BLUE}📦 Installing cert-manager...${NC}"
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.10.1/cert-manager.yaml || {
    echo -e "${YELLOW}⚠️  cert-manager may already be installed${NC}"
}

# Wait for cert-manager to be ready
echo -e "${BLUE}⏳ Waiting for cert-manager to be ready...${NC}"
kubectl wait --for=condition=ready pod -l app.kubernetes.io/instance=cert-manager -n cert-manager --timeout=120s || {
    echo -e "${YELLOW}⚠️  cert-manager may not be ready yet${NC}"
}

# Install Scaffold (Temporal Kubernetes Operator)
echo -e "${BLUE}📦 Installing Scaffold (Temporal Operator)...${NC}"
kubectl apply -f https://github.com/temporalio/scaffold/releases/latest/download/scaffold.yaml || {
    echo -e "${YELLOW}⚠️  Scaffold may already be installed${NC}"
}

# Wait for Scaffold to be ready
echo -e "${BLUE}⏳ Waiting for Scaffold operator to be ready...${NC}"
kubectl wait --for=condition=ready pod -l control-plane=controller-manager -n scaffold-system --timeout=120s || {
    echo -e "${YELLOW}⚠️  Scaffold operator may not be ready yet${NC}"
}

# Create namespaces
echo -e "${BLUE}📦 Creating namespaces...${NC}"
kubectl apply -f k8s/scaffold-install.yaml

# Deploy PostgreSQL
echo -e "${BLUE}📦 Deploying PostgreSQL...${NC}"
kubectl apply -f k8s/postgresql.yaml

# Wait for PostgreSQL to be ready
echo -e "${BLUE}⏳ Waiting for PostgreSQL to be ready...${NC}"
kubectl wait --for=condition=ready pod -l app=postgresql -n storyboard-editor --timeout=120s || {
    echo -e "${YELLOW}⚠️  PostgreSQL may not be ready yet${NC}"
}

# Initialize Temporal database
echo -e "${BLUE}📦 Initializing Temporal database...${NC}"
kubectl exec -n storyboard-editor -it $(kubectl get pod -n storyboard-editor -l app=postgresql -o jsonpath='{.items[0].metadata.name}') -- \
    psql -U postgres -c "CREATE DATABASE temporal;" || {
    echo -e "${YELLOW}⚠️  Temporal database may already exist${NC}"
}

# Deploy Temporal Cluster via Scaffold
echo -e "${BLUE}📦 Deploying Temporal Cluster via Scaffold...${NC}"
kubectl apply -f k8s/temporal-cluster.yaml

echo -e "${GREEN}✅ Setup complete!${NC}"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "1. Build images with Paketo: pack build storyboard-editor/backend --builder paketobuildpacks/builder-jammy-base"
echo "2. Deploy with Skaffold: skaffold dev --profile dev"
echo "3. Check Temporal UI: kubectl port-forward -n temporal-system svc/storyboard-temporal-ui 8080:8080"
