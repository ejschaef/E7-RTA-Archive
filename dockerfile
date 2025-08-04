
FROM python:3.12-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV COMPOSE_BAKE=true

# Install rust library
# Install build dependencies for maturin and Rust tooling
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    python3-dev \
    libssl-dev \
    pkg-config \
    patchelf \
    && rm -rf /var/lib/apt/lists/*

# Install Rust (for maturin and building)
RUN curl https://sh.rustup.rs -sSf | sh -s -- -y
ENV PATH="/root/.cargo/bin:${PATH}"

# Set working directory
WORKDIR /code

# Copy project files
COPY . /code

RUN mkdir -p /code/logs

# Install maturin
RUN pip install maturin

# Set working directory to rust folder
WORKDIR /code/e7_rs_tools

# Build and install Rust Python lib with maturin develop
RUN maturin build --release --interpreter python3
RUN pip install target/wheels/*.whl

# Set working directory to flask folder
WORKDIR /code

# Install dependencies
RUN pip install --upgrade pip && pip install -r requirements.txt

# Default command to run Flask
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "wsgi:app"]