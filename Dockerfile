FROM python:3.11-slim-bookworm

WORKDIR /app

# Copy mod-template (needed for project assembly — no compilation on server)
COPY mod-template/ /app/mod-template/
RUN chmod +x /app/mod-template/gradlew

# Install Python dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY backend/ .

# Set default template dir for production
ENV MOD_TEMPLATE_DIR=/app/mod-template

# Create non-root user and set ownership
RUN useradd -m -u 1000 appuser
RUN chown -R appuser:appuser /app

USER appuser

EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
