export type Values = {
  textfield: string;
  cast: string;
  embed?: string;
  image?: string;
  channel?: string;
};

export type ChannelResult = {
  result: {
    channel: {
      id: string;
      url: string;
      name: string;
      description: string;
      imageUrl: string;
      leadFid: number;
      hostFids: number[];
      createdAt: number;
      followerCount: number;
    };
  };
};

export type CastAddData = {
  data: {
    type: "MESSAGE_TYPE_CAST_ADD";
    fid: number;
    timestamp: number;
    network: "FARCASTER_NETWORK_MAINNET";
    castAddBody: {
      embedsDeprecated: any[];
      mentions: any[];
      parentUrl: string;
      text: string;
      mentionsPositions: any[];
      embeds: any[];
    };
    hash: string;
    hashScheme: "HASH_SCHEME_BLAKE3";
    signature: string;
    signatureScheme: "SIGNATURE_SCHEME_ED25519";
    signer: string;
  };
};

export type FileUploadResult = {
  IpfsHash: string;
  PinSize: number;
  Timestamp: string;
  isDuplicate?: boolean;
}

export type KeyRequestData = {
  deepLinkUrl: string;
  pollingToken: string;
  privateKey: string;
  publicKey: string;
}

export type PollRequestData = {
  state: string;
  userFid?: string;
}
