FROM denoland/deno:2.9.5

WORKDIR /app

# 1. Configs de dependência da raiz e do frontend. O Deno resolve o lock a
#    partir da raiz do workspace, por isso os dois níveis são necessários.
COPY deno.json deno.lock package.json ./
COPY frontend/deno.json frontend/package.json ./frontend/

# 2. Instala as dependências npm no cache do Deno
WORKDIR /app/frontend
RUN deno install

# 3. Copia o restante do código fonte
WORKDIR /app
COPY . .

EXPOSE 3000

# 4. Ambiente de desenvolvimento do frontend
WORKDIR /app/frontend
CMD ["deno", "task", "dev"]
