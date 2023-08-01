import {
  PublishCommand,
  PublishCommandInput,
  SNSClient,
  SubscribeCommand,
  SubscribeCommandInput,
} from "@aws-sdk/client-sns";

// a client can be shared by different commands.
const client = new SNSClient({ region: "us-east-1" });

export const createSubscription = async (params: SubscribeCommandInput) => {
  const result = await client.send(new SubscribeCommand(params));
  return result;
};

export const publishMessage = async (params: PublishCommandInput) => {
  const result = await client.send(new PublishCommand(params));
  return result;
};
