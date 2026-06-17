FROM node:20-slim

WORKDIR /app

# 1. Copia as configurações de pacotes da raiz E do frontend
COPY package*.json ./
COPY frontend/package*.json ./frontend/

# 2. Instala as dependências usando a inteligência de Workspaces do NPM
RUN npm install

# 3. Copia o restante dos arquivos do código fonte
COPY . .

EXPOSE 3000

# 4. Inicia o ambiente de desenvolvimento apontando explicitamente para o frontend
CMD ["npm", "run", "dev", "-w", "frontend"]
