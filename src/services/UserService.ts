import request from '../api/axios';
import { UserInfoKey } from '../constant';
import { Profile, UserInfo } from '../store';
import { getLocalStorage, tryParseJsonString } from '../helpers/utils';

export class UserService {
  static userProfile(email: string) {
    return request.get(`/api/login/userProfile/${email}`).then((res) => {
      const profile = tryParseJsonString<Profile>(res.body.profile);
      return {
        email: getLocalStorage<UserInfo>(UserInfoKey)?.email,
        profile: {
          theme: profile?.theme,
          fontSize: profile?.fontSize,
          language: profile?.language,
        },
      };
    });
  }

  static updateUserProfile(params) {
    return request.post(`/api/login/updateUserProfile`, params);
  }
  static loginAsGuest(params) {
    return request.post(`/api/login/loginAsGuest`, params);
  }
}
