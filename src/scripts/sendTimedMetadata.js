const AWS = require("aws-sdk");

require("dotenv").config();
const Ivs = new AWS.IVS({
  region: "us-west-2",
  accessKeyId: process.env.ACCESS_KEY,
  secretAccessKey: process.env.SECRET_KEY
});

const putMetadata = async (metadata, ttlSeconds) => {
  const input = {
    channelArn: process.env.CHANNEL_ARN,
    metadata
    // metadata: JSON.stringify(metadata)
  };
  let output;
  try {
    output = await Ivs.putMetadata(input).promise();
    // clear after ttlSeconds seconds
    if (ttlSeconds === 0) {
      return;
    }
    setTimeout(() => {
      putMetadata(" ", 0);
    }, ttlSeconds * 1000);
  } catch (e) {
    console.error(e);
    if (e.name === "ChannelNotBroadcasting") {
      output = { offline: true };
    } else {
      throw new Error(e);
    }
  }
  return output;
};
let metadata;
let ttlSeconds;

process.argv.forEach(function (val, index) {
  if (index === 2) {
    metadata = val;
  }
  if (index === 3) {
    ttlSeconds = Number(val);
  }
});

putMetadata(metadata, ttlSeconds);
