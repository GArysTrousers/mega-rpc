export type Call = {
  id: string;
  type: 'call';
  func: string;
  params: RpcParamList;
}

export type Reply = {
  id: string;
  type: 'reply'
  data: object;
}

export type Rpc = (params: RpcParamList) => Promise<any>
export type RpcParamList = { [key: string]: string | number | boolean | object }