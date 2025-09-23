import { S3Client } from "@aws-sdk/client-s3";

export function createS3Client() {
  const region =
    process.env.AWS_REGION || (process.env["AWS REGION"] as string | undefined);
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  if (!region || !accessKeyId || !secretAccessKey) {
    throw new Error(
      "Missing AWS credentials (AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)"
    );
  }
  return new S3Client({
    region,
    credentials: { accessKeyId, secretAccessKey },
  });
}
