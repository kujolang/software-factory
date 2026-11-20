FROM node:26.12.1-bookworm-slim
WORKDIR /opt/factory
ENV PLAYWRIGHT_BROWSERS_PATH=/opt/playwright
RUN npm install --ignore-scripts --no-audit --no-fund playwright@1.63.0 && npx playwright install --with-deps chromium && chmod -R a-w /opt/playwright
COPY lens /opt/lens
COPY lens-runtime-package-lock.json /opt/lens-runtime/package-lock.json
RUN cd /opt/lens-runtime && node -e "const p=require('./package-lock.json').packages[''];require('fs').writeFileSync('package.json',JSON.stringify(p))" && npm ci --ignore-scripts --no-audit --no-fund
RUN cd /opt/lens/bridge && npm ci --ignore-scripts --no-audit --no-fund && node node_modules/playwright-core/cli.js install chromium --only-shell
RUN chmod -R a-w /opt/lens /opt/lens-runtime /opt/playwright
COPY *.mjs /opt/factory/
RUN chmod -R a-w /opt/factory
RUN mkdir -p /workspace/private/input && chmod 700 /workspace/private
WORKDIR /workspace
