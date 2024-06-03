import AWS from "aws-sdk";

function generateUserId(length: number) {
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  const charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

const createToken = async (username: string) => {
  // todo this doesn't do any username authentication
  if (!process.env.ACCESS_KEY || !process.env.SECRET_KEY) {
    throw new Error("Missing AWS credentials");
  }
  const credentials = new AWS.Credentials({
    accessKeyId: process.env.ACCESS_KEY,
    secretAccessKey: process.env.SECRET_KEY
  });
  const IvsChat = new AWS.Ivschat({ region: "us-west-2", credentials });
  let token;

  const params = {
    roomIdentifier: process.env.ROOM_ID,
    userId: generateUserId(10), // right now we just autogen this
    attributes: {
      username
    },
    capabilities: ["SEND_MESSAGE"],
    sessionDurationInMinutes: 60
  };
  try {
    // @ts-ignore
    const data = await IvsChat.createChatToken(params).promise();
    token = data.token;
  } catch (e: unknown) {
    console.error(e);
    throw new Error(e as string);
  }
  return token;
};
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  const body = await request.json();
  const { username } = body;
  if (!username) {
    return new Response("Missing username", { status: 400 });
  }
  try {
    const token = await createToken(username);
    return new Response(token, { status: 200 });
  } catch (e: unknown) {
    return new Response(e as string, { status: 500 });
  }
}
