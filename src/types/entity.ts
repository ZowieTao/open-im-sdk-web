import { RequestFunc } from '../constant';

type WsResponse = {
  event: RequestFunc;
  errCode: number;
  errMsg: string;
  data: any;
  operationID: string;
};

type IMConfig = {
  platform: number;
  api_addr: string;
  ws_addr: string;
  log_level: number;
  is_compression?: boolean;
  is_external_extensions?: boolean;
};

type OfflinePush = {
  title: string;
  desc: string;
  ex: string;
  iOSPushSound: string;
  iOSBadgeCount: boolean;
};

type MessageEntity = {
  type: string;
  offset: number;
  length: number;
  url?: string;
  info?: string;
};

type PicBaseInfo = {
  uuid: string;
  type: string;
  size: number;
  width: number;
  height: number;
  url: string;
};

export { WsResponse, IMConfig, OfflinePush, MessageEntity, PicBaseInfo };
