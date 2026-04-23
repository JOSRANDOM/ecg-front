# =============================================================================
# Makefile — ECG Frontend (Next.js)
# =============================================================================

ifeq ($(OS),Windows_NT)
    ENV_COPY := copy .env.example .env
else
    ENV_COPY := cp .env.example .env
endif

IMAGE_NAME := ecg-front
PORT       := 3000
COMPOSE    := docker compose

ifneq ($(OS),Windows_NT)
    GREEN  := \033[0;32m
    YELLOW := \033[0;33m
    CYAN   := \033[0;36m
    RESET  := \033[0m
else
    GREEN  :=
    YELLOW :=
    CYAN   :=
    RESET  :=
endif

.DEFAULT_GOAL := help

.PHONY: help
help: ## Muestra esta ayuda
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  $(CYAN)%-18s$(RESET) %s\n", $$1, $$2}'

# ---------- Configuración ----------------------------------------------------
.PHONY: env
env: ## Crea el .env desde .env.example
	$(ENV_COPY)
	@echo "$(GREEN).env creado.$(RESET)"

# ---------- Desarrollo local (sin Docker) ------------------------------------
.PHONY: install
install: ## Instala las dependencias
	npm install

.PHONY: dev
dev: ## Inicia el servidor de desarrollo local en http://localhost:3000
	npm run dev

.PHONY: build-next
build-next: ## Compila la app Next.js localmente
	npm run build

.PHONY: lint
lint: ## Ejecuta el linter
	npm run lint

# ---------- Docker: build ----------------------------------------------------
.PHONY: build
build: ## Construye la imagen Docker de producción
	@echo "$(CYAN)Construyendo $(IMAGE_NAME):latest...$(RESET)"
	docker build --target runner -t $(IMAGE_NAME):latest .
	@echo "$(GREEN)Imagen lista.$(RESET)"

.PHONY: build-dev
build-dev: ## Construye la imagen Docker de desarrollo
	@echo "$(CYAN)Construyendo $(IMAGE_NAME):dev...$(RESET)"
	docker build --target development -t $(IMAGE_NAME):dev .
	@echo "$(GREEN)Imagen de desarrollo lista.$(RESET)"

# ---------- Docker: ciclo de vida --------------------------------------------
.PHONY: up
up: ## Levanta el contenedor de producción en segundo plano
	$(COMPOSE) up -d web
	@echo "$(GREEN)Frontend disponible en http://localhost:$(PORT)$(RESET)"

.PHONY: up-dev
up-dev: ## Levanta el contenedor de desarrollo con hot-reload
	$(COMPOSE) --profile dev up -d web-dev
	@echo "$(GREEN)Dev server en http://localhost:$(PORT)$(RESET)"

.PHONY: down
down: ## Detiene y elimina los contenedores
	$(COMPOSE) --profile dev down

.PHONY: stop
stop: ## Pausa los contenedores sin eliminarlos
	$(COMPOSE) --profile dev stop

.PHONY: restart
restart: down up ## Reinicia el contenedor de producción

# ---------- Docker: observabilidad -------------------------------------------
.PHONY: logs
logs: ## Muestra los logs de producción
	$(COMPOSE) logs -f web

.PHONY: logs-dev
logs-dev: ## Muestra los logs de desarrollo
	$(COMPOSE) logs -f web-dev

.PHONY: shell
shell: ## Shell dentro del contenedor de producción
	docker exec -it $$(docker ps -qf "name=ecg-front") /bin/sh

# ---------- Limpieza ---------------------------------------------------------
.PHONY: clean
clean: down ## Elimina contenedores e imágenes del proyecto
	docker rmi -f $(IMAGE_NAME):latest $(IMAGE_NAME):dev 2>/dev/null || true
	@echo "$(GREEN)Limpieza completada.$(RESET)"
