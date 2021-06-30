import fetch from '../utils/request'

class Model {
  api(options = {
    noData: false,
    resolveAllData: false
  }) {
    if (!options.method) options.method = 'get'

    return new Promise((resolve, reject) => {
      let request
      let config = {
        method: options.method,
        url: options.url
      }
      if (options.responseType) config.responseType = options.responseType

      switch (options.method) {
      case 'GET':
      case 'DELETE':
        request = fetch({
          ...config,
          params: options.params
        })
        break
      case 'POST':
      case 'PUT':
        request = fetch({
          ...config,
          data: options.data
        })
        break
      default:
      }
      request
        .then(response => {
          if (options.noData || options.resolveAllData) resolve(response)
          if (response?.data?.datas) resolve(response.data.datas)
          reject('缺少返回值 datas')
        })
        .catch(error => {
          reject(error)
        })
    })
  }

  get(options = {}) {
    options.method = 'GET'
    return this.api(options)
  }

  post(options = {}) {
    options.method = 'POST'
    return this.api(options)
  }

  put(options = {}) {
    options.method = 'PUT'
    return this.api(options)
  }

  delete(options = {}) {
    options.method = 'DELETE'
    return this.api(options)
  }
}

export default Model
