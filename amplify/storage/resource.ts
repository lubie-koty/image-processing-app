import { defineStorage } from "@aws-amplify/backend";
import { imageProcessor } from "../functions/image-processor/resource";

export const imagesBucket = defineStorage({
  name: 'imagesBucket',
  isDefault: true,
  access: (allow) => ({
    'images/*': [
      allow.authenticated.to(['read', 'write']),
      allow.resource(imageProcessor).to(['read', 'write']),
    ]
  }),
});
