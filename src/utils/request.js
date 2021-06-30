import axios from 'axios'
import { Message as $message } from 'element-ui'

const service = axios.create({
  timeout: 20000,
  baseURL: `${process.env.VUE_APP_BASE_URL}/api`
})

service.interceptors.request.use(
  (config) => {
    let token = localStorage.getItem('token')
    if (token) {
      config.headers['Authorization'] = token
    }
    if (config.url.indexOf('/ocr/') > -1) {
      config.headers['Ocr-Authorization'] = '123456789'
    }

    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptors
service.interceptors.response.use(
  (response) => {
    const res = response.data
    if (res.success) return response
    console.log(res)
    $message.error(res.message || '未知错误')
    return Promise.reject(res || '未知错误')
  },
  (error) => {
    $message.error(error.response?.data?.message || '未知错误')
    return Promise.reject(error)
  }
)

export default service
