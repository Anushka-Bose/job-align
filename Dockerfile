FROM node:20-bookworm

ENV DEBIAN_FRONTEND=noninteractive
ENV PYTHONUNBUFFERED=1
ENV PYTHON_EXECUTABLE=python3
ENV PIP_BREAK_SYSTEM_PACKAGES=1

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    python3-venv \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./requirements.txt
RUN pip3 install --break-system-packages --no-cache-dir -r requirements.txt \
    && python3 -m spacy download en_core_web_sm \
    && python3 -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('all-MiniLM-L6-v2')"

COPY JobAlign_backend/package*.json ./JobAlign_backend/
RUN cd JobAlign_backend && npm ci

COPY ml ./ml
COPY JobAlign_backend ./JobAlign_backend

WORKDIR /app/JobAlign_backend

CMD ["npm", "start"]
