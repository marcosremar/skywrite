# Skywrite on Alpine Linux - Orbit Stack

Este diretório contém a configuração para criar uma VM Alpine Linux no Orbit Stack com o projeto Skywrite instalado e configurado.

## Arquivos

- `skywrite-vm.yml` - Configuração da VM para Orbit Stack
- `setup-alpine.sh` - Script de instalação e configuração
- `docker-compose-alpine.yml` - Alternativa Docker para Alpine

## Instruções

### 1. Criar a VM no Orbit Stack

```bash
# Usando o arquivo de configuração
orbit create skywrite-vm.yml

# Ou criar manualmente:
orbit vm create skywrite \
  --image alpine:latest \
  --memory 2048 \
  --cpu 2 \
  --disk 20
```

### 2. Executar o script de configuração

```bash
# Copiar o script para a VM
orbit scp setup-alpine.sh skywrite:/tmp/

# Executar o script
orbit ssh skywrite "chmod +x /tmp/setup-alpine.sh && sudo /tmp/setup-alpine.sh"
```

### 3. Acessar a aplicação

Após a configuração, acesse:
- **Aplicação**: http://localhost:3002
- **Banco de dados**: PostgreSQL localhost:5432
- **Redis**: localhost:6379

## Serviços Configurados

- **Node.js 20+** - Runtime JavaScript
- **PostgreSQL** - Banco de dados principal
- **Redis** - Cache e filas
- **Chromium** - Para Puppeteer/geração de PDF
- **Skywrite** - Aplicação Next.js

## Portas

- 3002 - Next.js Application
- 5434 - PostgreSQL (mapeada para 5432 interna)
- 6379 - Redis

## Desenvolvimento

Para desenvolvimento com hot reload:

```bash
# Acessar a VM
orbit ssh skywrite

# Navegar para o projeto
cd /home/skywrite/skywrite

# Iniciar em modo desenvolvimento
npm run dev
```

## Gerenciamento dos Serviços

```bash
# Ver status dos serviços
rc-status

# Reiniciar aplicação
rc-service skywrite restart

# Ver logs
tail -f /var/log/skywrite.log
```
