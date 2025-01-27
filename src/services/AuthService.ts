import axios from 'axios';

import { getLocalStorage } from '../helpers/utils';
export class AuthService {
  static sendVerifyCodeByEmail(email: string) {
    return axios.get(`/api/login/getVerificationCode/${email}`, {
      headers: { 'access-token': 'no' },
    });
  }
  static loginVerify(params: { userName: string; verificationCode: string }) {
    return axios.post(`/api/login/verify`, params);
  }
  static refreshToken(params: { userName: string }) {
    return axios.get(`/api/login/refresh/${params.userName}`, {
      headers: { 'refresh-token': getLocalStorage<string>('refreshToken') },
    });
  }
}
