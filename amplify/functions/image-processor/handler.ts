import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getAmplifyDataClientConfig } from "@aws-amplify/backend/function/runtime"
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import { env } from '$amplify/env/image-processor';

import { v4 as uuidv4 } from 'uuid';
import { Jimp, JimpInstance } from 'jimp';

import type { Schema } from '../../data/resource'

const applyBlur = (image: JimpInstance) => {
  image.blur(5);
};

const applyBlackWhite = (image: JimpInstance) => {
  image.greyscale();
};

const applyPixelate = (image: JimpInstance) => {
  image.pixelate(10);
};

const applyRotate = (image: JimpInstance) => {
  image.rotate(90);
};

const applyMirror = (image: JimpInstance) => {
  image.flip({
    horizontal: true,
    vertical: false,
  });
};

const filtersByName: Record<string, Function> = {
  'blur': applyBlur,
  'blackWhite': applyBlackWhite,
  'pixelate': applyPixelate,
  'rotate': applyRotate,
  'mirror': applyMirror,
}

const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(env as any);

Amplify.configure(resourceConfig, libraryOptions);

const s3Client = new S3Client();
const dataClient = generateClient<Schema>();

export const handler: Schema["ImageProcessor"]["functionHandler"] = async (event, _) => {
  const { originalImageS3Key, filters } = event.arguments;

  // Download original image from S3
  const getOriginalCommand = new GetObjectCommand({
    Bucket: env.IMAGES_BUCKET_BUCKET_NAME,
    Key: originalImageS3Key,
  })
  const originalImage = (await s3Client.send(getOriginalCommand));
  if (!originalImage.Body) {
    console.error("Error downloading original image")
    return {
      success: false,
    }
  }

  // Apply Filters
  const processedImage = await Jimp.fromBuffer(
    (await originalImage.Body.transformToByteArray()).buffer
  )

  for (const filterName of filters) {
    const filterFunction = filtersByName[filterName];
    if (!filterFunction) {
      continue;
    }
    filterFunction(processedImage);
  }

  const processedImageKey = `images/${uuidv4()}`;
  const processedImageBody = await processedImage.getBuffer(originalImage.ContentType as any);

  // Upload processed image to S3
  const putProcessedCommand = new PutObjectCommand({
    Bucket: env.IMAGES_BUCKET_BUCKET_NAME,
    Key: processedImageKey,
    ContentType: originalImage.ContentType,
    Body: processedImageBody,
  })
  try {
    await s3Client.send(putProcessedCommand);
  } catch (error) {
    console.error("Error uploading processed image to S3", error)
    return {
      success: false,
    }
  }

  // Store metadata in DynamoDB
  const { data: existingImageMetadata, errors: listErrors } = await dataClient.models.ImageMetadata.list({
    filter: {
      originalImageS3Key: {
        eq: originalImageS3Key,
      }
    }
  })
  if (existingImageMetadata.length !== 1 || listErrors) {
    console.error("An error occured while querying existing image metadata", listErrors)
    return {
      success: false,
    }
  }
  const { data: updatedMetadata, errors: updateErrors } = await dataClient.models.ImageMetadata.update({
    id: existingImageMetadata[0].id,
    processedImageS3Key: processedImageKey,
  })
  if (!updatedMetadata?.processedImageS3Key || updateErrors) {
    console.error("Error updating image metadata", updateErrors)
    return {
      success: false,
    }
  }

  return {
    success: true,
    processedImageS3Key: processedImageKey,
  }
};
