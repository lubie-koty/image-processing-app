import { type ClientSchema, a, defineData } from "@aws-amplify/backend";
import { imageProcessor } from "../functions/image-processor/resource";

const schema = a.schema({
  ImageMetadata: a
    .model({
      userId: a.id().required(),
      fileName: a.string().required(),
      originalImageS3Key: a.string().required(),
      processedImageS3Key: a.string(),
    }).authorization(allow => [allow.authenticated()]),
  ImageProcessorResponse: a.customType({
    success: a.boolean().required(),
    processedImageS3Key: a.string(),
  }),
  ImageProcessor: a
    .query()
    .arguments({
      originalImageS3Key: a.string().required(),
      filters: a.string().required().array().required(),
    }).returns(a.ref("ImageProcessorResponse"))
    .handler(a.handler.function(imageProcessor)),
}).authorization(allow => [
  allow.resource(imageProcessor),
]);

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: "userPool",
  },
});
