/*
 * Copyright 2019 is-land
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import axios from 'axios';
import { getErrors } from 'utils/apiUtils';

function createAxios() {
  const instance = axios.create({
    validateStatus: status => status >= 200 && status < 300,
  });

  // Add a request interceptor
  instance.interceptors.request.use(config => {
    let headers = config.headers;
    if (
      config.method === 'post' ||
      config.method === 'put' ||
      config.method === 'patch'
    ) {
      if (headers['Content-Type'] === undefined) {
        headers = {
          ...headers,
          'Content-Type': 'application/json',
        };
      }
    }

    return {
      ...config,
      headers,
    };
  });

  // Add a response interceptor
  instance.interceptors.response.use(
    response => {
      if (response.config.url.includes('/validate')) {
        const errors = getErrors(response.data);

        if (errors.length > 0) {
          return {
            data: {
              errorMessage: {
                message:
                  'Test failed, please check you configs and try again later!',
              },
              isSuccess: false,
            },
          };
        }

        return {
          data: {
            result: response.data,
            isSuccess: true,
          },
        };
      }

      return {
        data: {
          result: response.data,
          isSuccess: true,
        },
      };
    },
    error => {
      const { data: errorMessage } = error.response;
      return {
        data: {
          errorMessage,
          isSuccess: false,
        },
      };
    },
  );

  return instance;
}

const axiosInstance = createAxios();

export default axiosInstance;
