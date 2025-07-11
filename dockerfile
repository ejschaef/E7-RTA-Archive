
FROM python:3.13-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV COMPOSE_BAKE=true

# Set working directory
WORKDIR /code

# Copy project files
COPY . /code

# Install dependencies
RUN pip install --upgrade pip && pip install -r requirements.txt

# Default command to run Flask
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "wsgi:app"]