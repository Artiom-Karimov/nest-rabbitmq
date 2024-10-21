ARG WORK_DIR=/app

FROM node:20.12.1-alpine3.18 AS build

ARG WORK_DIR
WORKDIR $WORK_DIR

COPY ./package.json ./yarn.lock ./tsconfig.json ./nest-cli.json ./tsconfig.build.json ./
COPY ./src ./src

RUN yarn && yarn build

RUN rm -rf node_modules && yarn cache clean && yarn install --production

FROM node:20.12.1-alpine3.18 AS runner

ARG WORK_DIR
WORKDIR $WORK_DIR

# COPY BACK
COPY --from=build --chown=node:node $WORK_DIR/yarn.lock            $WORK_DIR/yarn.lock
COPY --from=build --chown=node:node $WORK_DIR/package.json         $WORK_DIR/package.json
COPY --from=build --chown=node:node $WORK_DIR/dist                 $WORK_DIR/dist
COPY --from=build --chown=node:node $WORK_DIR/node_modules         $WORK_DIR/node_modules

USER node
CMD ["/bin/sh", "-c", "npm run start:prod"]
