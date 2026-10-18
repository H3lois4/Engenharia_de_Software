# Front-end do ms-dashboard — build com Vite, servido por nginx
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# URL pública do BFF (injetada no build). Vazia => caminhos relativos (local/compose).
ARG VITE_API_BASE_URL=""
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
RUN npm run build

FROM nginx:1.27-alpine
# Template: o entrypoint do nginx roda envsubst e gera o default.conf na partida,
# substituindo ${PORT} (Render define PORT; no compose usamos 80).
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html
ENV PORT=80
CMD ["nginx", "-g", "daemon off;"]
