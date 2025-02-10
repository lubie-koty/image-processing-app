import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { UpdateCommand, DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

import { v4 as uuidv4 } from 'uuid';
import { Jimp, JimpInstance } from 'jimp';

import type { Schema } from '../../data/resource'

const s3Client = new S3Client();
const S3_BUCKET_NAME = "imagesBucket";
const dynamoDbClient = new DynamoDBClient({});
const documentClient = DynamoDBDocumentClient.from(dynamoDbClient);
const DYNAMODB_TABLE_NAME = "ImageMetadata";

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

export const handler: Schema["ImageProcessor"]["functionHandler"] = async (event, _) => {
  const { originalImageS3Key, filters } = event.arguments;

  // Download original image from S3
  const getOriginalCommand = new GetObjectCommand({
    Bucket: "imagesBucket",
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
  const processedImage = await Jimp.read(
    await originalImage.Body.transformToByteArray()
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
    Bucket: S3_BUCKET_NAME,
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
  const updateMetadataCommand = new UpdateCommand({
    TableName: DYNAMODB_TABLE_NAME,
    Key: {
      originalImageS3Key: originalImageS3Key,
    },
    UpdateExpression: "set processedImageS3Key = :processedKey",
    ExpressionAttributeValues: {
      ":processedKey": processedImageKey,
    }
  })
  try {
    await documentClient.send(updateMetadataCommand);
  } catch (error) {
    console.error("Error uploading image metadata", error)
    return {
      success: false,
    }
  }

  return {
    success: true,
    processedImageS3Key: processedImageKey,
  }
};
