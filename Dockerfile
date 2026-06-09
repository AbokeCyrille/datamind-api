
# Image Python légère — moins de vulnérabilités, plus rapide
FROM python:3.12-slim

# Répertoire de travail dans le container
WORKDIR /app

# Copie les dépendances en premier (cache Docker optimisé)
# Si requirements.txt ne change pas, Docker ne réinstalle pas tout
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copie le code source
COPY app/ ./app/


# Variable d'environnement pour dire à Python de ne pas bufferiser les logs
ENV PYTHONUNBUFFERED=1

# Port exposé
EXPOSE 8000

# Commande de démarrage
# --host 0.0.0.0 = écoute sur toutes les interfaces (obligatoire en container)
# --workers 2    = 2 processus parallèles (adapté à 1 vCPU)
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]