export interface ImageMetadata {
  userId: string,
  fileName: string,
  originalImageS3Key: string,
  processedImageS3Key?: string | null,
}
