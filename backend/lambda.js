import serverlessExpress from '@vendia/serverless-express';
import app from './src/app.js';

let serverlessExpressInstance;

export const handler = async (event, context) => {
  if (!serverlessExpressInstance) {
    serverlessExpressInstance = serverlessExpress({ app });
  }
  return serverlessExpressInstance(event, context);
};
