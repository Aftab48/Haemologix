import { db } from "@/db";
import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3 = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export async function uploadDonorFile(
  field: DonorFileField,
  file: File,
  donorId: string
) {
  if (!file || !donorId) throw new Error("Missing upload data");
  if (file.size > 10 * 1024 * 1024) throw new Error("File too large");

  let uploadFile = file;

  if (!["image/jpeg", "image/png", "application/pdf"].includes(uploadFile.type)) {
    throw new Error("Unsupported file type");
  }

  const arrayBuffer = await uploadFile.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer); // S3 accepts Node.js Buffer

  const key = `donors/${donorId}/${Date.now()}-${uploadFile.name}`;
  const cmd = new PutObjectCommand({
    Bucket: process.env.S3_BUCKET_NAME!,
    Key: key,
    Body: buffer,
    ContentType: uploadFile.type,
  });

  try {
    await s3.send(cmd);
    const fileUrl = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;

    await db.donorRegistration.update({
      where: { id: donorId },
      data: { [field]: fileUrl },
    });

    return fileUrl;
  } catch (err) {
    throw new Error("File upload failed: " + (err as Error).message);
  }
}

export async function generatePresignedUrl(url: string | null) {
  if (!url) return null;

  try {
    // Return as-is if already signed
    if (url.includes("X-Amz-Signature")) return url;

    // Extract S3 object key safely
    const key = new URL(url).pathname.slice(1);

    const command = new GetObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME!,
      Key: key,
    });

    return await getSignedUrl(s3, command, { expiresIn: 900 }); // 15 minutes
  } catch (err) {
    console.error("Error generating presigned URL:", err);
    return null;
  }
}


export async function uploadHospitalFile(
  field: HospitalFileField,
  file: File,
  hospitalId: string
) {
  if (!file || !hospitalId) throw new Error("Missing upload data");
  if (file.size > 10 * 1024 * 1024) throw new Error("File too large");

  let uploadFile = file;

  if (
    !["image/jpeg", "image/png", "application/pdf"].includes(uploadFile.type)
  ) {
    throw new Error("Unsupported file type");
  }

  const arrayBuffer = await uploadFile.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const key = `hospitals/${hospitalId}/${Date.now()}-${uploadFile.name}`;
  const cmd = new PutObjectCommand({
    Bucket: process.env.S3_BUCKET_NAME!,
    Key: key,
    Body: buffer,
    ContentType: uploadFile.type,
  });

  try {
    await s3.send(cmd);
    const fileUrl = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;

    await db.hospitalRegistration.update({
      where: { id: hospitalId },
      data: { [field]: fileUrl },
    });

    return fileUrl;
  } catch (err) {
    throw new Error("File upload failed: " + (err as Error).message);
  }
}
