FROM python:3.12-slim-bookworm

# Install system dependencies required by PyMuPDF and EasyOCR
RUN apt-get update && apt-get install -y \
    g++ \
    make \
    pkg-config \
    python3-dev \
    libfreetype6-dev \
    libjpeg-dev \
    libpng-dev \
    zlib1g-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy requirements first (better caching)
COPY ai-server/requirements.txt .

# Upgrade pip and install dependencies
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy the rest of the ai-server code
COPY ai-server/ .

# Expose the port FastAPI will run on
EXPOSE 8000

# Start the app with uvicorn
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]