import squel from 'squel';
import { Database, QueryExecResult } from '@jlongster/sql.js';
import { MessageStatus, MessageType } from '@/constant';

export type ClientMessage = { [key: string]: any };

export function localChatLogs(db: Database): QueryExecResult[] {
  db.exec(`
      create table if not exists 'local_chat_logs' (
        'client_msg_id' char(64),
        'server_msg_id' char(64),
        'send_id' char(64),
        'recv_id' char(64),
        'sender_platform_id' integer,
        'sender_nick_name' varchar(255),
        'sender_face_url' varchar(255),
        'session_type' integer,
        'msg_from' integer,
        'content_type' integer,
        'content' varchar(1000),
        'is_read' numeric,
        'status' integer,
        'seq' integer default 0,
        'send_time' integer,
        'create_time' integer,
        'attached_info' varchar(1024),
        'ex' varchar(1024),
        
        'is_react' numeric,
        'is_external_extensions' numeric,
        'msg_first_modify_time' integer,

        primary key ('client_msg_id'))
    `);

  const tableInfo = db.exec('PRAGMA table_info(local_chat_logs)');
  if (tableInfo.length <= 0) {
    return tableInfo;
  }

  // check column for old version
  const hasColumnIsReact = tableInfo[0].values.find(v => v[1] === 'is_react');
  const hasColumnIsExternalExtensions = tableInfo[0].values.find(
    v => v[1] === 'is_external_extensions'
  );
  const hasColumnMsgFirstModifyTime = tableInfo[0].values.find(
    v => v[1] === 'msg_first_modify_time'
  );

  const result: QueryExecResult[] = [];
  if (!hasColumnIsReact) {
    result.push(
      ...db.exec(`
        alter table local_chat_logs add is_react numeric
    `)
    );
  }

  if (!hasColumnIsExternalExtensions) {
    result.push(
      ...db.exec(`
        alter table local_chat_logs add is_external_extensions numeric
    `)
    );
  }

  if (!hasColumnMsgFirstModifyTime) {
    result.push(
      ...db.exec(`
        alter table local_chat_logs add msg_first_modify_time integer
    `)
    );
  }

  return result;
}

export function localErrChatLogs(db: Database): QueryExecResult[] {
  return db.exec(`
      create table if not exists 'local_err_chat_logs' (
        "seq" integer,
        "client_msg_id" char(64),
        "server_msg_id" char(64),
        "send_id" char(64),
        "recv_id" char(64),
        "sender_platform_id" integer,
        "sender_nick_name" varchar(255),
        "sender_face_url" varchar(255),
        "session_type" integer,
        "msg_from" integer,
        "content_type" integer,
        "content" varchar(1000),
        "is_read" numeric,
        "status" integer,
        "send_time" integer,
        "create_time" integer,
        "attached_info" varchar(1024),
        "ex" varchar(1024),
        primary key ('seq'))
    `);
}

export function getMessage(db: Database, messageId: string): QueryExecResult[] {
  return db.exec(`
      select * from 'local_chat_logs' where client_msg_id='${messageId}'
    `);
}

export function getMultipleMessage(
  db: Database,
  msgIDList: string[]
): QueryExecResult[] {
  const values = msgIDList.map(v => `'${v}'`).join(',');

  const sql = `select * from local_chat_logs where client_msg_id in (${values}) order by send_time desc;`;

  return db.exec(sql);
}

export function getSendingMessageList(db: Database): QueryExecResult[] {
  return db.exec(`
      select * from local_chat_logs where status = 1;
    `);
}

export function getNormalMsgSeq(db: Database): QueryExecResult[] {
  return db.exec(`
      select ifnull(max(seq),0) from local_chat_logs;
    `);
}

export function updateMessageTimeAndStatus(
  db: Database,
  clientMsgID: string,
  serverMsgID: string,
  sendTime: number,
  status: number
): QueryExecResult[] {
  return db.exec(
    `
      update local_chat_logs set
        server_msg_id='${serverMsgID}',
        status=${status} ,
        send_time=${sendTime}
      where client_msg_id='${clientMsgID}' and seq=0;
    `
  );
}

export function updateMessage(
  db: Database,
  clientMsgId: string,
  message: ClientMessage
): QueryExecResult[] {
  const sql = squel
    .update()
    .table('local_chat_logs')
    .setFields(message)
    .where(`client_msg_id = '${clientMsgId}'`)
    .toString();

  return db.exec(sql);
}

export function insertMessage(
  db: Database,
  message: ClientMessage
): QueryExecResult[] {
  const sql = squel
    .insert()
    .into('local_chat_logs')
    .setFields(message)
    .toString();
  return db.exec(sql);
}

export function batchInsertMessageList(
  db: Database,
  messageList: ClientMessage[]
): QueryExecResult[] {
  const sql = squel
    .insert()
    .into('local_chat_logs')
    .setFieldsRows(messageList)
    .toString();

  return db.exec(sql);
}

export function getMessageList(
  db: Database,
  sourceID: string,
  sessionType: number,
  count: number,
  startTime: number,
  isReverse: boolean,
  loginUserID: string
): QueryExecResult[] {
  const isSelf = loginUserID === sourceID;
  const condition = isSelf
    ? `recv_id = "${sourceID}" and send_id = "${sourceID}"`
    : `(recv_id = "${sourceID}" or send_id = "${sourceID}")`;
  const sql = `
  select * from local_chat_logs
    where
        ${condition}
        and status <= ${MessageStatus.Failed}
        and send_time ${isReverse ? '>' : '<'} ${startTime}
        and session_type = ${sessionType}
    order by send_time ${isReverse ? 'asc' : 'desc'}
    limit ${count};
`;
  return db.exec(sql);
}

export function getMessageListNoTime(
  db: Database,
  sourceID: string,
  sessionType: number,
  count: number,
  isReverse: boolean,
  loginUserID: string
): QueryExecResult[] {
  const isSelf = loginUserID === sourceID;
  const condition = isSelf
    ? `recv_id = "${sourceID}" and send_id = "${sourceID}"`
    : `(recv_id = "${sourceID}" or send_id = "${sourceID}")`;
  const sql = `
  select * from local_chat_logs
      where
        ${condition}
        and status <= ${MessageStatus.Failed}
        and session_type = ${sessionType}
      order by send_time ${isReverse ? 'asc' : 'desc'}
      limit ${count};`;
  return db.exec(sql);
}

export function searchAllMessageByContentType(
  db: Database,
  contentType: MessageType
) {
  return db.exec(`
  select * from local_chat_logs
      where
          content_type = ${contentType};
    `);
}

export function getMsgSeqListByPeerUserID(
  db: Database,
  userID: string
): QueryExecResult[] {
  return db.exec(
    `  
    SELECT seq FROM local_chat_logs 
    WHERE recv_id="${userID}" 
    or send_id="${userID}";
    `
  );
}

export function getMsgSeqListBySelfUserID(
  db: Database,
  userID: string
): QueryExecResult[] {
  return db.exec(
    `  
    SELECT seq FROM local_chat_logs 
    WHERE recv_id="${userID}" 
    and send_id="${userID}";
    `
  );
}

export function getMsgSeqListByGroupID(
  db: Database,
  groupID: string
): QueryExecResult[] {
  return db.exec(
    `  
    SELECT seq FROM local_chat_logs 
    WHERE recv_id="${groupID}";
    `
  );
}

export function updateMessageStatusBySourceID(
  db: Database,
  sourceID: string,
  status: number,
  sessionType: number,
  loginUserID: string
): QueryExecResult[] {
  let condition = `(send_id="${sourceID}" or recv_id="${sourceID}")`;
  if (sessionType === 1 && sourceID === loginUserID) {
    condition = `send_id= "${sourceID}" AND recv_id="${sourceID}"`;
  }
  return db.exec(
    `
        update local_chat_logs
        set status=${status}
        where session_type=${sessionType}
        AND ${condition};
    `
  );
}

export function getAbnormalMsgSeq(db: Database) {
  return db.exec("SELECT IFNULL(max(seq), 0) FROM 'local_err_chat_logs'");
}

export function getAbnormalMsgSeqList(db: Database) {
  return db.exec("SELECT 'seq' FROM 'local_err_chat_logs'");
}
