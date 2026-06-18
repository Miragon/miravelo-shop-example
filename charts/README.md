# Local Kubernetes Setup with Minikube, Helm, Traefik and CNPG

Dieser Setup läuft komplett hinter Traefik. Zugriff erfolgt über:

- Frontend: `http://localhost:8080/`
- Shop Backend: `http://localhost:8080/api/...`
- Warehouse Backend: `http://localhost:8080/warehouse/...`
- Delivery Backend: `http://localhost:8080/delivery/...`
- Keycloak: `http://localhost:8080/auth/` (Admin-Konsole: `/auth/admin`, `admin` / `admin`)

## Authentifizierung (Keycloak)

Keycloak läuft als eigener Chart **im Cluster** (`infrastructure/keycloak`) hinter Traefik unter
`/auth`. Der `miravelo`-Realm wird per `keycloak-config-cli` (Helm post-install Hook) importiert und
legt die Test-User `alice`, `bob` und `shopkeeper` (Passwort `test`) an.

Die Services sind passend konfiguriert:

- Frontend (`shop-frontend/values.local.yaml`): `env.KEYCLOAK_URL` / `KEYCLOAK_REALM` / `KEYCLOAK_CLIENT_ID`
- Backend (`shop-backend/values.local.yaml`):
  - `application.security.issuer-uri` → browser-seitige URL (`http://localhost:8080/auth/realms/miravelo`),
    muss mit dem `iss`-Claim der Tokens übereinstimmen.
  - `application.security.jwk-set-uri` → clusterinterner Service
    (`http://keycloak:8080/auth/realms/miravelo/protocol/openid-connect/certs`). Wird als
    `SPRING_SECURITY_OAUTH2_RESOURCESERVER_JWT_JWK_SET_URI` ins Deployment gemappt, da der
    browser-seitige `issuer-uri` aus dem Pod heraus nicht erreichbar ist. Die `iss`-Prüfung läuft
    weiterhin gegen den `issuer-uri`.

## Prerequisites

- Docker
- Minikube (docker driver)
- kubectl
- Helm

## 1) Minikube starten

```bash
minikube config set driver docker
minikube start -p miravelo-example
kubectl config use-context miravelo-example
```

## 2) Projekt bauen und Images in Minikube bauen

```bash
cd ..
./gradlew build
npm --prefix services/shop/shop-frontend run build

minikube -p miravelo-example image build -t shop-backend:local -f services/shop/shop-backend/Dockerfile .
minikube -p miravelo-example image build -t delivery-backend:local -f services/delivery/delivery-backend/Dockerfile .
minikube -p miravelo-example image build -t warehouse-backend:local -f services/warehouse/warehouse-backend/Dockerfile .
minikube -p miravelo-example image build -t shop-frontend:local -f services/shop/shop-frontend/Dockerfile .
```

## 3) Infrastruktur deployen (CNPG Operator -> Postgres -> Traefik -> Keycloak)

```bash
helm dependency build ./infrastructure/cnpg-operator
helm upgrade --install cnpg ./infrastructure/cnpg-operator \
  --namespace cnpg-operator \
  --create-namespace \
  -f infrastructure/cnpg-operator/values.yaml

kubectl create namespace miravelo-local
kubectl apply -f local_secrets/postgres-secret.yaml

helm upgrade --install postgres ./infrastructure/postgres \
  --namespace miravelo-local \
  -f infrastructure/postgres/values.yaml 

helm dependency build ./infrastructure/traefik
helm upgrade --install traefik ./infrastructure/traefik \
  --namespace traefik \
  --create-namespace \
  -f infrastructure/traefik/values.yaml 

# Keycloak (Release-Name "keycloak", damit der Service clusterintern als
# http://keycloak:8080 erreichbar ist – darauf zeigt die backend jwk-set-uri).
helm upgrade --install keycloak ./infrastructure/keycloak \
  --namespace miravelo-local
```

## 4) Services deployen

```bash
helm upgrade --install shop-backend ./shop-backend \
  --namespace miravelo-local \
  -f ./shop-backend/values.local.yaml

helm upgrade --install delivery-backend ./delivery-backend \
  --namespace miravelo-local \
  -f ./delivery-backend/values.local.yaml

helm upgrade --install warehouse-backend ./warehouse-backend \
  --namespace miravelo-local \
  -f ./warehouse-backend/values.local.yaml

helm upgrade --install shop-frontend ./shop-frontend \
  --namespace miravelo-local \
  -f ./shop-frontend/values.local.yaml
```

## 5) Zugriff aktivieren

Traefik läuft als `LoadBalancer` auf Port `8080` (Services routen intern per Traefik IngressRoute):

```bash
minikube tunnel -p miravelo-example
```

## 6) Routing testen

```bash
curl http://localhost:8080/
curl http://localhost:8080/api/articles
curl http://localhost:8080/warehouse/api/articles
curl http://localhost:8080/delivery/api/articles
```

## Nützliche Befehle

```bash
minikube list profiles
kubectl get pods -A
kubectl get svc -A
kubectl get ingressroute -n miravelo-local
kubectl get middleware -n miravelo-local
```
