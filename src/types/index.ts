// 通用类型定义

// ------------------------------
// --Response请求体的格式--------
// --Request是返回response的格式-

export interface LineData {
  index?: string
  startPoint: [number,number]
  endPoint: [number,number]
  startColor: string,
  endColor: string
}

export interface User {
  id: string
  username: string
  email: string
  createdAt: string
  phone?: string
}

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  message?: string
  error?: string
}

export interface UserInfoResponse {
  code: number;
  message: {
    user: {
      username: string;
      email: string;
      phonenumber: string;
      userid: number;
      is_admin: boolean;
      is_verified: boolean;
      last_login_ip: string;
      last_login_time: number;
    };
  };
}

export interface GetMeResponse {
  code: number
  message: {
    role?: string;
    error?: string;
    msg?: string;
  }
}