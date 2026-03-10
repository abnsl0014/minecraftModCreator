FROM python:3.11-slim-bookworm

# Install JDK 17 for Gradle builds (bookworm has openjdk-17)
RUN apt-get update && \
    apt-get install -y openjdk-17-jdk-headless && \
    rm -rf /var/lib/apt/lists/*
ENV JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64

WORKDIR /app

# Copy mod-template (needed for builds)
COPY mod-template/ /app/mod-template/
RUN chmod +x /app/mod-template/gradlew

# Install Python dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY backend/ .

# Set default template dir for production
ENV MOD_TEMPLATE_DIR=/app/mod-template

# Pre-warm Gradle cache (downloads Forge dependencies at build time)
RUN mkdir -p /app/mod-template/src/main/java/com/modcreator/warmup && \
    printf 'package com.modcreator.warmup;\nimport net.minecraftforge.fml.common.Mod;\n@Mod("warmup")\npublic class Warmup { public Warmup() {} }' > /app/mod-template/src/main/java/com/modcreator/warmup/Warmup.java && \
    printf 'org.gradle.jvmargs=-Xmx3G\norg.gradle.daemon=false\nminecraft_version=1.20.1\nminecraft_version_range=[1.20.1,1.21)\nforge_version=47.2.0\nforge_version_range=[47,)\nloader_version_range=[47,)\nmapping_channel=official\nmapping_version=1.20.1\nmod_id=warmup\nmod_name=Warmup\nmod_license=MIT\nmod_version=1.0.0\nmod_group_id=com.modcreator.warmup\nmod_authors=System\nmod_description=Cache warmup' > /app/mod-template/gradle.properties && \
    cd /app/mod-template && ./gradlew build --no-daemon 2>&1 || true && \
    rm -rf /app/mod-template/src/main/java/com/modcreator/warmup /app/mod-template/gradle.properties /app/mod-template/build /app/mod-template/run

EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
