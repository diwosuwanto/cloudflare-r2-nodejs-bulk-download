require("dotenv").config(); // Load environment variables from .env file
const {
  S3Client,
  ListObjectsV2Command,
  GetObjectCommand,
} = require("@aws-sdk/client-s3");
const fs = require("fs");
const path = require("path");

// Configure AWS SDK with your Cloudflare R2 credentials
const s3 = new S3Client({
  endpoint: `https://${process.env.ACCOUNT_ID}.r2.cloudflarestorage.com`,
  region: "auto",
  credentials: {
    accessKeyId: process.env.ACCESS_KEY_ID,
    secretAccessKey: process.env.SECRET_ACCESS_KEY,
  },
});

const bucketName = process.env.BUCKET_NAME;
const localDownloadPath = "./downloads";

async function downloadBucket(prefix = "") {
  const params = {
    Bucket: bucketName,
    Prefix: prefix,
  };

  try {
    const data = await s3.send(new ListObjectsV2Command(params));

    for (const item of data.Contents) {
      const itemPath = item.Key;
      const localFilePath = path.join(localDownloadPath, itemPath);

      // Create directory if it doesn't exist
      fs.mkdirSync(path.dirname(localFilePath), { recursive: true });

      // Download file
      const fileStream = fs.createWriteStream(localFilePath);
      const getObjectParams = { Bucket: bucketName, Key: itemPath };
      const command = new GetObjectCommand(getObjectParams);
      const objectData = await s3.send(command);
      objectData.Body.pipe(fileStream);

      console.log(`Downloaded: ${itemPath}`);
    }

    // If there are more objects to fetch
    if (data.IsTruncated) {
      await downloadBucket(data.NextContinuationToken);
    }
  } catch (error) {
    console.error("Error:", error);
  }
}

// Start the download process
downloadBucket();
