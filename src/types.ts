type Call = {
  id: string;
  type: 'call';
  func: string;
  params: RpcParamList;
}

type Reply = {
  id: string;
  type: 'reply'
  data: object;
}

type Rpc = (params: RpcParamList) => Promise<any>
type RpcParamList = { [key: string]: string | number | boolean | object }