import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { imageProcessor } from './functions/image-processor/resource';
import { imagesBucket } from './storage/resource';

defineBackend({
  auth,
  data,
  imagesBucket,
  imageProcessor,
});
