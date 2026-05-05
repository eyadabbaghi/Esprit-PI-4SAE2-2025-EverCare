# Architecture DevOps - EverCare

## Résumé Exécutif

Ce document décrit l'architecture DevOps complète du projet EverCare, une plateforme de soins pour patients atteints de la maladie d'Alzheimer.

---

## 1. Architecture CI/CD - Jenkins

### 1.1 Jenkinsfiles (18 pipelines)

| # | Service | Emplacement |
|---|---------|-------------|
| 1 | Frontend | `frontend/Jenkinsfile` |
| 2 | API Gateway | `backend/ApiGateway/Jenkinsfile` |
| 3 | Eureka Service | `backend/Eureka-service/Jenkinsfile` |
| 4 | User Service | `backend/User/Jenkinsfile` |
| 5 | Blog Service | `backend/blog-service/Jenkinsfile` |
| 6 | Medical Record | `backend/medical-record-service/Jenkinsfile` |
| 7 | Appointment | `backend/appointment-service/Jenkinsfile` |
| 8 | Communication | `backend/communication-service/Jenkinsfile` |
| 9 | Notification | `backend/notification-service/Jenkinsfile` |
| 10 | Cognitive Stimulation | `backend/cognitive-stimulation-service/Jenkinsfile` |
| 11 | Tracking Service | `backend/Tracking-service/Jenkinsfile` |
| 12 | DailyMe Service | `backend/Dailyme-service/Jenkinsfile` |
| 13 | Alerts Service | `backend/Alerts/Jenkinsfile` |
| 14 | Activities Service | `backend/Activities/Jenkinsfile` |
| 15 | AI Service (Backend) | `backend/evercare-ai-service/Jenkinsfile` |
| 16 | Face Service | `face-service/Jenkinsfile` |
| 17 | AI Frontend | `frontend/evercare-ai/Jenkinsfile` |
| 18 | CD Pipeline | `Jenkinsfile.cd` (racine) |

### 1.2 Étapes CI

```
Checkout Git → Build → Test (JUnit) → SonarQube → Package → Docker Build → Docker Push → Archive
```

### 1.3 Configuration Jenkins

- **Branche:** Badr-branch
- **SonarQube:** http://10.0.2.15:9000
- **Docker Registry:** Docker Hub (badrftw)
- **Déclenchement CD:** Manuel (Build with Parameters)

---

## 2. Conteneurisation - Docker

### 2.1 Images Docker

| Service | Image | Port |
|---------|-------|------|
| Frontend | `badrftw/evercare-frontend:latest` | 80 |
| API Gateway | `badrftw/evercare-api-gateway:latest` | 8089 |
| Eureka | `badrftw/evercare-eureka-service:latest` | 8761 |
| MySQL | `mysql:8.0` | 3306 |
| Keycloak | `quay.io/keycloak/keycloak:24.0` | 8080 (NodePort 31880) |
| User Service | `badrftw/evercare-user-service:latest` | 8096 |
| Blog Service | `badrftw/evercare-blog-service:latest` | 8087 |
| Medical Record | `badrftw/evercare-medical-record:latest` | 8083 |
| Appointment | `badrftw/evercare-appointment-service:latest` | 8086 |
| Communication | `badrftw/evercare-communication-service:latest` | 8094 |
| Notification | `badrftw/evercare-notification-service:latest` | 8097 |
| Cognitive | `badrftw/evercare-cognitive-stimulation-service:latest` | 8084 |
| Tracking | `badrftw/evercare-tracking-service:latest` | 8099 |
| DailyMe | `badrftw/evercare-dailyme-service:latest` | 8098 |
| Alerts | `badrftw/evercare-alerts-service:latest` | 8095 |
| Activities | `badrftw/evercare-activities-service:latest` | 8092 |
| AI Backend | `badrftw/evercare-ai-service:latest` | 8080 |
| Face Service | `badrftw/evercare-face-service:latest` | 8100 |
| AI Frontend | `badrftw/evercare-ai-frontend:latest` | 8000 |

### 2.2 Docker Compose

**Fichier:** `docker-compose.yml` (21 services)

```yaml
services:
  - mysql (3306)
  - keycloak (8180)
  - eureka (8761)
  - api-gateway (8089)
  - 14 microservices (8080-8099)
  - frontend (80)
  - face-service (8100)
  - evercare-ai-frontend (8000)
```

---

## 3. Orchestration - Kubernetes

### 3.1 Structure K8s

```
k8s/
├── namespace.yaml       # Namespace: evercare
├── configmap.yaml       # Configurations
├── secrets.yaml         # Secrets (DB, Keycloak, JWT, Docker, GROQ)
├── ingress.yaml         # Ingress controller
├── hpa.yaml            # Horizontal Pod Autoscaler
├── network-policy.yaml # Network policies
├── deployments/        # 19 deployments + services
│   ├── mysql.yaml
│   ├── keycloak.yaml
│   ├── eureka.yaml
│   ├── api-gateway.yaml
│   ├── frontend.yaml
│   ├── 14 microservices
│   ├── face-service.yaml
│   └── evercare-ai-frontend.yaml
└── monitoring/         # Prometheus + Grafana
    ├── prometheus.yaml
    ├── grafana.yaml
    ├── alertmanager.yaml
    └── prometheus-alerts.yaml
```

### 3.2 Ressources Kubernetes

| Type | Quantité |
|------|----------|
| Namespace | 1 (evercare) |
| Deployments | 19 |
| Services | 19 |
| ConfigMap | 1 |
| Secrets | 1 |
| Ingress | 1 |
| HPA | 6 |
| Network Policies | 4 |
| PVC | 1 (MySQL 5Gi) |

### 3.3 HPA (Horizontal Pod Autoscaler)

| Service | Min Replicas | Max Replicas | CPU Target |
|---------|--------------|--------------|------------|
| API Gateway | 1 | 5 | 70% |
| User Service | 1 | 3 | 70% |
| Blog Service | 1 | 3 | 70% |
| Appointment Service | 1 | 3 | 70% |
| Medical Record | 1 | 3 | 70% |
| Frontend | 1 | 5 | 70% |

### 3.4 Network Policies

- `deny-all` - Bloquer tout trafic par défaut
- `mysql-access` - Permettre accès MySQL uniquement aux backends
- `keycloak-access` - Permettre accès Keycloak uniquement à API Gateway et backends
- `eureka-access` - Permettre accès Eureka uniquement aux backends

---

## 4. Monitoring

### 4.1 Composants

| Composant | Port | Description |
|-----------|------|-------------|
| Prometheus | 9090 | Collecte métriques |
| Grafana | 3000 | Visualisation |
| AlertManager | 9093 | Gestion alertes |

### 4.2 Métriques Surveillées

- CPU utilization (>70%)
- Memory utilization (>80%)
- Pod status (Running/CrashLoopBackOff)
- Disponibilité services

### 4.3 Dashboards Grafana

- evercare-overview.json
- evercare-services.json
- evercare-alerts.json

---

## 5. Sécurité

### 5.1 Authentication

- **Keycloak:** Single Sign-On (SSO)
- **URL:** http://keycloak:8080
- **Realm:** EverCareRealm
- **Admin:** admin/admin

### 5.2 Authorization

- **JWT Tokens** pour API REST
- **OAuth2** Resource Server

### 5.3 Secrets K8s

```yaml
- DATABASE_USERNAME: root
- DATABASE_PASSWORD: "admin"
- KEYCLOAK_ADMIN: admin
- KEYCLOAK_ADMIN_PASSWORD: admin
- JWT_SECRET: evercare-jwt-secret-key-change-in-production
- DOCKER_USERNAME: badrftw
- DOCKER_PASSWORD: ""
- GROQ_API_KEY: ""  # Pour AI Frontend
```

---

## 6. Services Spéciaux

### 6.1 Face Service

| Détail | Valeur |
|--------|--------|
| **Type** | Python FastAPI |
| **Framework** | DeepFace + OpenCV |
| **Port** | 8100 |
| **Database** | MySQL EverCaredb |
| **Endpoints** | /face/register, /face/verify, /health |

### 6.2 AI Frontend (Chatbot)

| Détail | Valeur |
|--------|--------|
| **Type** | Python FastAPI |
| **IA** | Groq (Llama 3.3) |
| **Port** | 8000 |
| **API Key** | GROQ_API_KEY (env) |
| **Endpoint** | /api/chat |
| **Connexion** | Direct depuis Angular (pas via Gateway) |

---

## 7. Flux DevOps

```
┌─────────────────────────────────────────────────────────────┐
│                     CODE SOURCE                             │
│                  GitHub (Badr-branch)                       │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                        JENKINS CI                           │
│  Checkout → Build → Test → Sonar → Docker Build → Push     │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                      DOCKER HUB                             │
│              badrftw/evercare-*:latest                      │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                       JENKINS CD                            │
│            (Manual trigger - Jenkinsfile.cd)                │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                      MINIKUBE / K8S                         │
│   Deploy → HPA → Network Policy → Monitoring (Prometheus)  │
└─────────────────────────────────────────────────────────────┘
```

---

## 8. Commandes Utiles

### Docker Compose

```bash
# Démarrer tous les services
docker-compose up -d

# Voir status
docker-compose ps

# Logs
docker-compose logs -f evercare-frontend

# Arrêter
docker-compose down
```

### Kubernetes

```bash
# Déployer tout
kubectl apply -f k8s/

# Voir pods
kubectl get pods -n evercare

# Logs
kubectl logs -n evercare -l app=api-gateway

# Restart deployment
kubectl rollout restart deployment/api-gateway-deployment -n evercare

# HPA status
kubectl get hpa -n evercare

# Network policies
kubectl get networkpolicy -n evercare
```

---

## 9. Tableau Récapitulatif

| Composant | Technology | Status |
|-----------|------------|--------|
| **Source Control** | GitHub | ✅ |
| **CI/CD** | Jenkins | ✅ (18 pipelines) |
| **Container** | Docker | ✅ (17 images) |
| **Orchestration** | Docker Compose | ✅ (21 services) |
| **Orchestration K8s** | Kubernetes | ✅ (19 deployments) |
| **Service Discovery** | Eureka | ✅ |
| **API Gateway** | Spring Cloud Gateway | ✅ |
| **Auth** | Keycloak + JWT | ✅ |
| **Database** | MySQL 8.0 | ✅ |
| **Monitoring** | Prometheus + Grafana | ✅ |
| **Alerts** | AlertManager | ✅ |
| **Auto-scaling** | HPA | ✅ (6 services) |
| **Network Security** | Network Policies | ✅ |
| **Secrets** | K8s Secrets | ✅ |

---

## 10. Contact & Documentation

- **Repository:** https://github.com/eyadabbaghi/Esprit-PI-4SAE2-2025-EverCare
- **Branche:** Badr-branch
- **Documentation:** README.md (racine)

---

*Document généré le 30 Avril 2026*
*Architecture DevOps EverCare - Production Ready*