# EverCare - Infrastructure DevOps

## Architecture

### Services

| Service | Port | Image Docker |
|---------|------|--------------|
| MySQL | 3306 | mysql:8.0 |
| Keycloak | 8180 | quay.io/keycloak/keycloak:24.0 |
| Eureka | 8761 | badrftw/evercare-eureka-service |
| API Gateway | 8089 | badrftw/evercare-api-gateway |
| Blog Service | 8087 | badrftw/evercare-blog-service |
| Medical Record | 8083 | badrftw/evercare-medical-record |
| Appointment | 8086 | badrftw/evercare-appointment-service |
| Communication | 8094 | badrftw/evercare-communication-service |
| Notification | 8097 | badrftw/evercare-notification-service |
| Cognitive Stimulation | 8084 | badrftw/evercare-cognitive-stimulation-service |
| User | 8096 | badrftw/evercare-user-service |
| Tracking | 8099 | badrftw/evercare-tracking-service |
| Dailyme | 8098 | badrftw/evercare-dailyme-service |
| Alerts | 8095 | badrftw/evercare-alerts-service |
| Activities | 8092 | badrftw/evercare-activities-service |
| AI Service | 8080 | badrftw/evercare-ai-service |
| Frontend | 80 | badrftw/evercare-frontend |

---

## Développement Local (Docker Compose)

### Prérequis
- Docker
- Docker Compose

### Démarrage

```bash
# Lancer tous les services
docker-compose up -d

# Voir les logs
docker-compose logs -f

# Arrêter tous les services
docker-compose down

# Reconstruire les images
docker-compose build --no-cache
```

### URLs d'accès

| Service | URL |
|---------|-----|
| Frontend | http://localhost |
| API Gateway | http://localhost:8089 |
| Eureka | http://localhost:8761 |
| Keycloak | http://localhost:8180 |
| MySQL | localhost:3306 |

---

## Kubernetes (Minikube)

### Prérequis
- Minikube
- kubectl
- Docker

### Démarrage

```bash
# Démarrer Minikube
minikube start

# Appliquer les manifests
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secrets.yaml
kubectl apply -f k8s/ingress.yaml
kubectl apply -f k8s/deployments/
kubectl apply -f k8s/monitoring/

# Vérifier les pods
kubectl get pods -n evercare

# Voir les services
kubectl get svc -n evercare

# Accéder au dashboard
minikube dashboard

# Arrêter Minikube
minikube stop
```

### Monitoring

| Service | URL | NodePort |
|---------|-----|----------|
| Prometheus | http://localhost:9090 | 30909 |
| Grafana | http://localhost:3000 | 30300 |
| AlertManager | http://localhost:9093 | - |

### Identifiants Grafana
- Username: `admin`
- Password: `admin`

---

## CI/CD (Jenkins)

### Jobs Jenkins configurés

Chaque microservice dispose d'un Jenkinsfile avec le pipeline suivant:

1. **Checkout** - Récupération du code depuis GitHub
2. **Build Maven** - Compilation du code Java
3. **Test** - Exécution des tests unitaires
4. **SonarQube** - Analyse de qualité du code
5. **Package** - Création du JAR exécutable
6. **Build Docker** - Construction de l'image Docker
7. **Push Docker** - Publication sur Docker Hub

### Configuration Jenkins requise

**Credentials à configurer:**
- `github-evercare` - Token GitHub
- `dockerhub-evercare` - Identifiants Docker Hub
- `sonarqube-token` - Token SonarQube

---

## Variables d'environnement

### Base de données
```
SPRING_DATASOURCE_URL=jdbc:mysql://mysql:3306/EverCaredb
SPRING_DATASOURCE_USERNAME=root
SPRING_DATASOURCE_PASSWORD=
```

### Eureka
```
EUREKA_CLIENT_SERVICE_URL_DEFAULTZONE=http://eureka:8761/eureka/
```

### Keycloak (JWT)
```
SPRING_SECURITY_OAUTH2_RESOURCESERVER_JWT_JWK_SET_URI=http://keycloak:8080/realms/EverCareRealm/protocol/openid-connect/certs
```

---

## Commandes utiles

### Docker Compose
```bash
# Lancer un service spécifique
docker-compose up -d eureka

# Voir les logs d'un service
docker-compose logs -f blog-service

# Reconstruire un service
docker-compose build blog-service
docker-compose up -d blog-service
```

### Kubernetes
```bash
# Voir les pods
kubectl get pods -n evercare

# Voir les logs d'un pod
kubectl logs -f <pod-name> -n evercare

# Describe un pod
kubectl describe pod <pod-name> -n evercare

# Executer bash dans un pod
kubectl exec -it <pod-name> -n evercare -- /bin/bash

# Supprimer tous les ressources
kubectl delete -f k8s/ -n evercare
```

---

## Structure des fichiers

```
EverCare/
├── docker-compose.yml          # Orchestration locale
├── k8s/                       # Manifests Kubernetes
│   ├── namespace.yaml
│   ├── configmap.yaml
│   ├── secrets.yaml
│   ├── ingress.yaml
│   ├── deployments/           # Deployments K8s
│   └── monitoring/           # Prometheus, Grafana
└── backend/                  # Code source microservices
    ├── blog-service/
    │   ├── Dockerfile
    │   └── Jenkinsfile
    └── ...
```

---

## Dépannage

### Docker Compose
```bash
# Voir les logs
docker-compose logs

# Redémarrer un service
docker-compose restart <service>

# Supprimer les volumes
docker-compose down -v
```

### Kubernetes
```bash
# Voir les événements
kubectl get events -n evercare

# Voir les ressources défaillantes
kubectl get all -n evercare

# Debug un pod
kubectl describe pod <pod-name> -n evercare
kubectl logs <pod-name> -n evercare
```

---

## Contribution

1. Créer une branche `feature/...`
2. Faire les modifications
3. Pousser vers GitHub
4. Le pipeline Jenkins build et push automatiquement
5. Mettre à jour docker-compose ou K8s si nécessaire