# EverCare DevOps Makefile

.PHONY: help docker-up docker-down docker-logs k8s-start k8s-stop k8s-status k8s-logs monitoring-start clean all

# Couleurs
GREEN := \033[0;32m
YELLOW := \033[0;33m
BLUE := \033[0;34m
NC := \033[0m

help:
	@echo ""
	@echo "$(BLUE)EverCare DevOps - Commands$(NC)"
	@echo ""
	@echo "$(GREEN)Docker Compose (Development):$(NC)"
	@echo "  make docker-up        - Lancer tous les services"
	@echo "  make docker-down     - Arrêter tous les services"
	@echo "  make docker-logs    - Voir les logs"
	@echo "  make docker-rebuild - Reconstruire les images"
	@echo ""
	@echo "$(GREEN)Kubernetes (Production):$(NC)"
	@echo "  make k8s-start       - Démarrer Minikube et déployer"
	@echo "  make k8s-stop        - Arrêter Minikube"
	@echo "  make k8s-status      - Voir le statut des pods"
	@echo "  make k8s-logs        - Voir les logs"
	@echo "  make k8s-dashboard   - Ouvrir le dashboard Minikube"
	@echo ""
	@echo "$(GREEN)Monitoring:$(NC)"
	@echo "  make prometheus      - Ouvrir Prometheus"
	@echo "  make grafana         - Ouvrir Grafana"
	@echo ""
	@echo "$(GREEN)Maintenance:$(NC)"
	@echo "  make clean           - Nettoyer tout"
	@echo ""

# ============================================
# Docker Compose
# ============================================

docker-up:
	@echo "$(YELLOW)Lancement des services Docker...$(NC)"
	docker-compose up -d
	@echo "$(GREEN)Services lancés!$(NC)"
	@echo "Frontend: http://localhost"
	@echo "API Gateway: http://localhost:8089"
	@echo "Eureka: http://localhost:8761"
	@echo "Keycloak: http://localhost:8180"

docker-down:
	@echo "$(YELLOW)Arrêt des services Docker...$(NC)"
	docker-compose down

docker-logs:
	docker-compose logs -f

docker-rebuild:
	@echo "$(YELLOW)Reconstruction des images Docker...$(NC)"
	docker-compose build --no-cache
	docker-compose up -d

# ============================================
# Kubernetes
# ============================================

k8s-start:
	@echo "$(YELLOW)Démarrage de Minikube...$(NC)"
	minikube start
	@echo "$(YELLOW)Déploiement des manifests Kubernetes...$(NC)"
	kubectl apply -f k8s/namespace.yaml
	kubectl apply -f k8s/configmap.yaml
	kubectl apply -f k8s/secrets.yaml
	kubectl apply -f k8s/ingress.yaml
	kubectl apply -f k8s/deployments/
	kubectl apply -f k8s/monitoring/
	@echo "$(GREEN)Déploiement terminé!$(NC)"
	@echo "$(GREEN)Statut des pods:$(NC)"
	kubectl get pods -n evercare
	@echo ""
	@echo "$(BLUE)URLs d'accès:$(NC)"
	@echo "Frontend: http://$(shell minikube ip):30080"
	@echo "API Gateway: http://$(shell minikube ip):30889"
	@echo "Eureka: http://$(shell minikube ip):30876"
	@echo "Keycloak: http://$(shell minikube ip):30180"
	@echo "Prometheus: http://$(shell minikube ip):30909"
	@echo "Grafana: http://$(shell minikube ip):30300"

k8s-stop:
	@echo "$(YELLOW)Arrêt de Minikube...$(NC)"
	minikube stop

k8s-status:
	@echo "$(YELLOW)Statut des ressources:$(NC)"
	@echo ""
	@echo "$(BLUE)Pods:$(NC)"
	kubectl get pods -n evercare
	@echo ""
	@echo "$(BLUE)Services:$(NC)"
	kubectl get svc -n evercare
	@echo ""
	@echo "$(BLUE)Deployments:$(NC)"
	kubectl get deploy -n evercare

k8s-logs:
	@echo "$(YELLOW)Logs des pods (tapez Ctrl+C pour quitter):$(NC)"
	kubectl logs -f -l app -n evercare --tail=100

k8s-dashboard:
	@echo "$(YELLOW)Ouverture du dashboard Minikube...$(NC)"
	minikube dashboard

k8s-delete:
	@echo "$(YELLOW)Suppression de tous les ressources K8s...$(NC)"
	kubectl delete -f k8s/ -n evercare
	kubectl delete namespace evercare

# ============================================
# Monitoring
# ============================================

prometheus:
	@echo "$(YELLOW)Ouverture de Prometheus...$(NC)"
	minikube service prometheus-service -n evercare

grafana:
	@echo "$(YELLOW)Ouverture de Grafana...$(NC)"
	minikube service grafana-service -n evercare

# ============================================
# Nettoyage
# ============================================

clean:
	@echo "$(YELLOW)Nettoyage Docker et Kubernetes...$(NC)"
	docker-compose down -v 2>/dev/null || true
	minikube delete 2>/dev/null || true
	@echo "$(GREEN)Nettoyage terminé!$(NC)"

all: docker-up