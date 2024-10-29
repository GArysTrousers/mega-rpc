export type Call = {
  id: string;
  type: 'call';
  func: string;
  params: RpcParamList;
}

export type Reply = {
  id: string;
  type: 'reply';
  ok: boolean;
  data: any;
}

export type Rpc = (params: RpcParamList) => Promise<any>
export type RpcParamList = { [key: string]: string | number | boolean | object }
