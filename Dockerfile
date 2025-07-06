# Step 1: Build Frontend
FROM node:18 AS frontend
WORKDIR /app
COPY Frontend/ .                      # Use correct case
RUN npm install && npm run build

# Step 2: Backend with FastAPI
FROM python:3.11-slim AS backend
WORKDIR /app

# Copy backend files
COPY Backend/ .

# Copy built frontend to backend's frontend folder (make sure FastAPI serves it)
COPY --from=frontend /app/dist ./frontend

# Install Python deps
RUN pip install --no-cache-dir -r requirements.txt

# Expose the app port
EXPOSE 8000

# Run FastAPI
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
