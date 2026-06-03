#!/bin/bash

# ==============================================================================
# Alfabra Vector - Ubuntu Server Firewall Setup (UFW)
# ==============================================================================
# Este script configura o firewall básico (UFW) para a VM Ubuntu Server.
# Baseado na arquitetura:
# 1. Necessidade de internet (Saída liberada para APIs de IA).
# 2. Entrada restrita a IPs corporativos na lista branca (Whitelist).
# 3. Portas internas do Docker NÃO devem estar expostas ao host (somente Frontend/API).

set -e

# Requer privilégios de root
if [ "$EUID" -ne 0 ]; then
  echo "Por favor, execute como root (sudo ./setup_firewall.sh)"
  exit 1
fi

echo "Iniciando configuração do UFW (Uncomplicated Firewall)..."

# ==============================================================================
# VARIÁVEIS DE CONFIGURAÇÃO (AJUSTE CONFORME A REDE CORPORATIVA)
# ==============================================================================
# Substitua estas variáveis pelos blocos de IP reais (CIDR) da empresa.

# IP ou Range da equipe de Infraestrutura (Acesso SSH)
# Exemplo: "10.0.0.0/8" ou "192.168.50.100"
INFRA_IP_RANGE="10.10.10.0/24" 

# IP ou Range da Intranet Corporativa (Acesso à Plataforma Web)
# Exemplo: "192.168.0.0/16" (Toda a rede) ou sub-redes específicas
CORP_WHITELIST_RANGE="192.168.100.0/24"

# ==============================================================================
# 1. Instalação e Reset
# ==============================================================================
apt-get update && apt-get install -y ufw
echo "Resetando regras antigas do UFW..."
ufw --force reset

# ==============================================================================
# 2. Políticas Padrão (Default Policies)
# ==============================================================================
# Bloqueia tudo que tenta entrar por padrão
ufw default deny incoming
# Permite tudo que tenta sair (Necessário para APIs de IA externas, apt-get, etc)
ufw default allow outgoing

# ==============================================================================
# 3. Regras de Entrada (Ingress)
# ==============================================================================

echo "Configurando portas de Administração (SSH)..."
# Permite SSH apenas do IP/Range da equipe de infraestrutura
ufw allow from $INFRA_IP_RANGE to any port 22 proto tcp comment 'Acesso SSH Infra'

echo "Configurando portas de Aplicação (HTTP/HTTPS)..."
# Permite acesso Web apenas da lista branca corporativa
ufw allow from $CORP_WHITELIST_RANGE to any port 80 proto tcp comment 'Frontend HTTP Corporativo'
ufw allow from $CORP_WHITELIST_RANGE to any port 443 proto tcp comment 'Frontend HTTPS Corporativo'

# ==============================================================================
# 4. Ativação
# ==============================================================================
echo "Ativando o UFW..."
ufw --force enable

echo "=============================================================================="
echo "Firewall configurado com sucesso!"
echo "Status atual das regras:"
ufw status verbose
echo "=============================================================================="
echo "⚠️  ATENÇÃO PARA O DOCKER: O Docker ignora o UFW por padrão."
echo "Certifique-se de que no seu 'docker-compose.yml', APENAS o container do"
echo "Frontend/API Gateway tenha a diretiva 'ports: - 80:80 / 443:443'."
echo "NENHUM serviço de banco de dados (Postgres, VectorDB) deve ter 'ports'."
echo "=============================================================================="
