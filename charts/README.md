# Local Kubernetes Setup with Minikube, Helm, Traefik and CNPG

This setup runs entirely behind Traefik. Access goes through:

- Frontend: `http://localhost:8080/`
- Shop Backend: `http://localhost:8080/api/...`
- Warehouse Backend: `http://localhost:8080/warehouse/...`
- Delivery Backend: `http://localhost:8080/delivery/...`
- Keycloak: `http://localhost:8080/auth/` (admin console: `/auth/admin`, `admin` / `admin`)

## Authentication (Keycloak)

Keycloak runs as its own chart **inside the cluster** (`infrastructure/keycloak`) behind Traefik under
`/auth`. The `miravelo` realm is imported via `keycloak-config-cli` (Helm post-install hook) and
creates the test users `alice`, `bob` and `shopkeeper` (password `test`).

The services are configured accordingly:

- Frontend (`shop-frontend/values.local.yaml`): `env.KEYCLOAK_URL` / `KEYCLOAK_REALM` / `KEYCLOAK_CLIENT_ID`
- Backend (`shop-backend/values.local.yaml`):
  - `application.security.issuer-uri` → browser-side URL (`http://localhost:8080/auth/realms/miravelo`),
    must match the `iss` claim of the tokens.
  - `application.security.jwk-set-uri` → cluster-internal service
    (`http://keycloak:8080/auth/realms/miravelo/protocol/openid-connect/certs`). Mapped into the
    deployment as `SPRING_SECURITY_OAUTH2_RESOURCESERVER_JWT_JWK_SET_URI`, because the browser-side
    `issuer-uri` is not reachable from inside the pod. The `iss` check still runs against the
    `issuer-uri`.

## Prerequisites

- Docker
- Minikube (docker driver)
- kubectl
- Helm

## 1) Start Minikube

```bash
minikube config set driver docker
minikube start -p miravelo-example
kubectl config use-context miravelo-example
```

## 2) Build the project and build images in Minikube

```bash
cd ..
./gradlew build
npm --prefix services/shop/shop-frontend run build

minikube -p miravelo-example image build -t shop-backend:local -f services/shop/shop-backend/Dockerfile .
minikube -p miravelo-example image build -t delivery-backend:local -f services/delivery/delivery-backend/Dockerfile .
minikube -p miravelo-example image build -t warehouse-backend:local -f services/warehouse/warehouse-backend/Dockerfile .
minikube -p miravelo-example image build -t shop-frontend:local -f services/shop/shop-frontend/Dockerfile .
```

## 3) Deploy the infrastructure (CNPG operator -> Postgres -> Traefik -> Keycloak)

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

# Keycloak (release name "keycloak", so the service is reachable cluster-internally
# as http://keycloak:8080 — the backend jwk-set-uri points there).
helm upgrade --install keycloak ./infrastructure/keycloak \
  --namespace miravelo-local
```

## 4) Deploy the services

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

## 5) Enable access

Traefik runs as a `LoadBalancer` on port `8080` (services route internally via Traefik IngressRoute):

```bash
minikube tunnel -p miravelo-example
```

## 6) Test the routing

```bash
curl http://localhost:8080/
curl http://localhost:8080/api/articles
curl http://localhost:8080/warehouse/api/articles
curl http://localhost:8080/delivery/api/articles
```

## Useful commands

```bash
minikube list profiles
kubectl get pods -A
kubectl get svc -A
kubectl get ingressroute -n miravelo-local
kubectl get middleware -n miravelo-local
```
