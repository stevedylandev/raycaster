import { useState } from "react";
import { LocalStorage,Form, ActionPanel, Action, showToast, getPreferenceValues, Toast } from "@raycast/api";
import { Message, NobleEd25519Signer, CastAddBody, makeCastAdd } from "@farcaster/core";
import { Values, ChannelResult, CastAddData, FileUploadResult } from "./types";
import { hexToBytes } from "@noble/hashes/utils";
import fetch from "node-fetch";
import fs from "fs";
import FormData from "form-data";

interface Preferences {
  PINATA_JWT?: string;
  GATEWAY?: string;
}

const preferences = getPreferenceValues<Preferences>();

const JWT = preferences.PINATA_JWT;
const GATEWAY = preferences.GATEWAY;

export default function Command() {
  const [lengthError, setLengthError] = useState<string | undefined>();;

  function dropLengthErrorIfNeeded() {
    if (lengthError && lengthError.length > 0) {
      setLengthError(undefined);
    }
  }

  async function uploadFile(selectedFile: string) {
    if (!preferences.PINATA_JWT) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Files require a Pinata API Key",
      });
      throw new Error("Check Pinata API Key");
    }

    await showToast({ style: Toast.Style.Animated, title: "Uploading File..." });

    try {
      const data = new FormData();

      const file = fs.createReadStream(selectedFile);

      data.append("file", file);

      const uploadReq = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${JWT}`,
        },
        body: data,
      });

      if (!uploadReq.ok) {
        throw new Error("Problem uploading file");
      }
      const uploadRes = (await uploadReq.json()) as FileUploadResult;

      const headersReq = await fetch(`https://${GATEWAY}/ipfs/${uploadRes.IpfsHash}`, {
        method: "HEAD",
      });

      const fileExtensions: any = {
        "image/jpeg": "jpeg",
        "image/png": "png",
        "image/webp": "webp",
        "image/gif": "gif",
      };
      const selectedFileType: any = headersReq.headers.get("content-type");
      const defaultExtension = "png";
      const fileExtension = fileExtensions[selectedFileType] || defaultExtension;

      const link = `https://${GATEWAY}/ipfs/${uploadRes.IpfsHash}?filename=image.${fileExtension}`;

      return link;
    } catch (error) {
      console.log("Problem uploading files", error);
      throw new Error("Problem Uploading File");
    }
  }

  async function sendCast(
    message: string,
    parentUrl?: string | undefined,
    embed?: string | undefined,
    file?: string | undefined,
  ) {
    await showToast({ style: Toast.Style.Animated, title: "Sending Cast..." });
    const FID = await LocalStorage.getItem("fid")
    const SIGNER = await LocalStorage.getItem("signerKey") as string

    if(!FID || !SIGNER){
      throw new Error("Sign in first")
    }
    try {
      const dataOptions = {
        fid: Number(FID),
        network: 1,
      };

      const privateKeyBytes = hexToBytes(SIGNER.slice(2));
      const ed25519Signer = new NobleEd25519Signer(privateKeyBytes);

      const castBody: CastAddBody = {
        text: message,
        embeds: [],
        embedsDeprecated: [],
        mentions: [],
        mentionsPositions: [],
        parentUrl: parentUrl,
      };

      if (embed) {
        const embedUrl = { url: embed };
        castBody.embeds.push(embedUrl);
      }

      if (file) {
        const fileUrl = { url: file };
        castBody.embeds.push(fileUrl);
      }

      const castAddReq = await makeCastAdd(castBody, dataOptions, ed25519Signer);
      const castAdd: any = castAddReq._unsafeUnwrap();
      const messageBytes = Buffer.from(Message.encode(castAdd).finish());

      const castRequest = await fetch("https://hub.pinata.cloud/v1/submitMessage", {
        method: "POST",
        headers: { "Content-Type": "application/octet-stream" },
        body: messageBytes,
      });

      const castResult = await castRequest.json();
      console.log(castResult);
      return castResult;
    } catch (error) {
      console.log("problem sending cast:", error);
    }
  }

  async function handleSubmit(values: Values) {
    try {
      let channelUrl: string | undefined;
      let fileUrl: string | undefined;

      if (values.channel) {
        const channelReq = await fetch(`https://api.warpcast.com/v1/channel?channelId=${values.channel}`);

        if (!channelReq.ok) {
          throw new Error("Channel not found");
        }

        const channelRes = (await channelReq.json()) as ChannelResult;
        channelUrl = channelRes.result.channel.url;
        console.log(channelRes);
      } else {
        channelUrl = undefined;
      }

      if (values.image && values.image.length > 0) {
        const upload = await uploadFile(values.image[0]);
        fileUrl = upload;
      } else {
        fileUrl = undefined;
      }

      const castRes = await sendCast(values.cast, channelUrl, values.embed, fileUrl);
      if (!castRes) {
        throw new Error("Trouble sending cast");
      }

      const castData = castRes as CastAddData;
      showToast({ title: "Cast Sent!", message: castData.data.hash as string });
    } catch (error) {
      console.log(error);
      showToast({ title: "Problem sending cast", message: error as string, style: Toast.Style.Failure });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="At least one field should be used to send a cast" />
      <Form.TextArea
        id="cast"
        title="Cast"
        placeholder="Type you main cast here"
        error={lengthError}
        onChange={dropLengthErrorIfNeeded}
        onBlur={(event: any) => {
          if (event.target.value?.length > 320) {
            setLengthError("Exceeds 320 character maximum");
          } else {
            dropLengthErrorIfNeeded();
          }
        }}
      />
      <Form.TextField id="embed" title="Embed" placeholder="Past a link here" />
      <Form.TextField id="channel" title="Channel" placeholder="raycast" />
      <Form.Separator />
      <Form.FilePicker
        id="image"
        title="Image"
        canChooseDirectories={false}
        allowMultipleSelection={false}
        info="Requires Pinata API key"
        storeValue={false}
      />
    </Form>
  );
}
