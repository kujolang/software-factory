FROM node:26.12.1-bookworm-slim
WORKDIR /opt/factory
ENV PLAYWRIGHT_BROWSERS_PATH=/opt/playwright
RUN npm install --ignore-scripts --no-audit --no-fund playwright@1.63.0 && npx playwright install --with-deps chromium && chmod -R a-w /opt/playwright
COPY *.mjs /opt/factory/
RUN chmod -R a-w /opt/factory
RUN mkdir -p /workspace/private/input && chmod 700 /workspace/private
WORKDIR /workspace
