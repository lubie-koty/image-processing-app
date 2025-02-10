import { defineFunction } from '@aws-amplify/backend';

export const imageProcessor = defineFunction({
  name: 'image-processor',
  entry: './handler.ts',
  runtime: 20,
  timeoutSeconds: 30,
  layers: {
    'image-processing-lambda-dependencies':
      'arn:aws:lambda:eu-north-1:715841326143:layer:image-processing-lambda-dependencies:2',
  }
});
