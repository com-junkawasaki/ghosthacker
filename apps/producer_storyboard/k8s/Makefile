.PHONY: setup install upgrade uninstall status logs port-forward clean

# Default namespace
NAMESPACE ?= producer-storyboard

# Helm chart path
CHART_PATH = helm/producer-storyboard

setup:
	@echo "🚀 Running setup script..."
	@./setup.sh

install:
	@echo "📦 Installing Producer Storyboard..."
	@cd $(CHART_PATH) && helm dependency update
	@helm upgrade --install producer-storyboard $(CHART_PATH) \
		--namespace $(NAMESPACE) \
		--create-namespace

upgrade:
	@echo "⬆️  Upgrading Producer Storyboard..."
	@cd $(CHART_PATH) && helm dependency update
	@helm upgrade producer-storyboard $(CHART_PATH) \
		--namespace $(NAMESPACE)

uninstall:
	@echo "🗑️  Uninstalling Producer Storyboard..."
	@helm uninstall producer-storyboard --namespace $(NAMESPACE) || true
	@kubectl delete namespace $(NAMESPACE) || true
	@kubectl delete namespace temporal-system || true

status:
	@echo "📊 Pod Status:"
	@kubectl get pods -n $(NAMESPACE)
	@echo ""
	@echo "📊 Temporal Pods:"
	@kubectl get pods -n temporal-system
	@echo ""
	@echo "📊 Services:"
	@kubectl get svc -n $(NAMESPACE)
	@kubectl get svc -n temporal-system

logs-grpc:
	@kubectl logs -f deployment/producer-storyboard-grpc-go -n $(NAMESPACE)

logs-worker:
	@kubectl logs -f deployment/producer-storyboard-temporal-worker -n $(NAMESPACE)

logs-temporal:
	@kubectl logs -f -l app.kubernetes.io/component=frontend -n temporal-system

port-forward-grpc:
	@kubectl port-forward -n $(NAMESPACE) svc/producer-storyboard-grpc-go 8081:8081

port-forward-temporal:
	@kubectl port-forward -n temporal-system svc/temporal-frontend 7233:7233

port-forward-ui:
	@kubectl port-forward -n temporal-system svc/temporal-ui 8080:8080

clean:
	@echo "🧹 Cleaning up..."
	@make uninstall
	@kubectl delete -f https://github.com/temporalio/scaffold/releases/latest/download/scaffold.yaml || true

help:
	@echo "Available targets:"
	@echo "  setup              - Run full setup script"
	@echo "  install            - Install Helm chart"
	@echo "  upgrade            - Upgrade Helm chart"
	@echo "  uninstall          - Uninstall Helm chart"
	@echo "  status             - Show pod and service status"
	@echo "  logs-grpc          - Show gRPC service logs"
	@echo "  logs-worker        - Show Temporal worker logs"
	@echo "  logs-temporal      - Show Temporal server logs"
	@echo "  port-forward-grpc  - Port forward gRPC service (8081)"
	@echo "  port-forward-temporal - Port forward Temporal frontend (7233)"
	@echo "  port-forward-ui    - Port forward Temporal UI (8080)"
	@echo "  clean              - Remove everything"
	@echo "  help               - Show this help"
