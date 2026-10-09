# BFF do ms-dashboard
FROM python:3.12-slim

WORKDIR /app

# Dependências primeiro (cache de camada)
COPY pyproject.toml ./
RUN pip install --no-cache-dir --upgrade pip && pip install --no-cache-dir .

COPY app ./app

ENV PORT=8006
EXPOSE 8006

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT}"]
