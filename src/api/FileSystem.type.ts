import { KeyValueType, ParamsObject } from "../components/Http";
import { METHODS } from "../constant";

// ------ /api/filesystem/saveInterface ------
export interface QueryInterfaceReq {
  id: string;
}
export interface QueryInterfaceRes {
  id: string;
  endpoint: string | null;
  method: typeof METHODS[number] | null;
  preRequestScript: string | null;
  testScript: string | null;
  body: object | null;
  headers: object | null;
  params: object | null;
  auth: string | null;
}

// ------ /api/filesystem/saveInterface ------
export interface SaveInterfaceReq {
  auth: {
    authActive: boolean;
    authType: string;
    token: string;
  } | null;
  body: { contentType: string; body: string | null };
  endpoint: string;
  headers: KeyValueType[];
  id: string;
  method: string;
  params: KeyValueType[];
  preRequestScript: string | null;
  testScript: string | null;
}
export interface SaveInterfaceRes {
  success: boolean;
}