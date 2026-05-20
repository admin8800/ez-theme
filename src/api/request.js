
import axios from 'axios';
import { API_BASE_URL, getApiBaseUrl, isXiaoV2board, isXboard, CUSTOM_HEADERS_CONFIG } from '@/utils/baseConfig';
import { readAuthData } from '@/api/client/authToken';
import { applyCustomHeaders } from '@/api/client/headers';
import { normalizeRequestError } from '@/api/client/errors';

const request = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});

const clearExpiredAuthState = () => {
  window.isUserLoggedIn = false;
  window.authDataInStorage = null;
  window.authCookieFailure = false;

  [
    'token',
    'auth_data',
    'cookie_auth_data',
    'userInfo',
    'is_admin',
    'vuex',
    'user',
    'auth'
  ].forEach(key => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  });

  ['auth_data', 'XSRF-TOKEN', 'laravel_session', 'token'].forEach(name => {
    ['/', '/dashboard', '/user', '/admin'].forEach(path => {
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=${path};`;
    });
  });
};

request.interceptors.request.use(
  async config => {
    config.baseURL = getApiBaseUrl();
    
    if ((isXiaoV2board() || isXboard()) && config.method === 'post' && config.data) {
      const formData = new URLSearchParams();
      for (const key in config.data) {
        if (Object.prototype.hasOwnProperty.call(config.data, key)) {
          formData.append(key, config.data[key]);
        }
      }
      
      config.data = formData;
      config.headers['Content-Type'] = 'application/x-www-form-urlencoded';
    }
    
    const authData = await readAuthData();
    
    if (authData) {
      config.headers['Authorization'] = authData;
    }
    
    try {
      applyCustomHeaders(config.headers, CUSTOM_HEADERS_CONFIG);
    } catch (error) {
      console.error('应用自定义标头失败:', error);
    }
    
    return config;
  },
  error => {
    console.error('请求拦截器错误:', error);
    return Promise.reject(new Error('请求配置错误'));
  }
);

request.interceptors.response.use(
  async response => {
    try {
      const res = response.data;
      
      if (res && res.message === '未登录或登陆已过期') {
        console.log('检测到登录已过期，执行登出操作');
        clearExpiredAuthState();
        window.location.href = '/#/login';
        return Promise.reject(new Error(res.message));
      }
      
      return res;
    } catch (err) {
      console.error('响应数据处理错误:', err);
      return Promise.reject(new Error('响应数据处理错误'));
    }
  },
  error => {
    console.error('请求错误:', error);
    
    return Promise.reject(normalizeRequestError(error));
  }
);

export default request;
