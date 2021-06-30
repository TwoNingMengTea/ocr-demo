import Vue from 'vue'
import App from './App.vue'
import 'reset-css/sass/_reset'
import ElementUI, { Message } from 'element-ui'
import '@/style/element-variables'

const message = {}
const messageType = ['success', 'error', 'warning', 'info']
messageType.forEach(type => {
  message[type] = (message, duration = 2000) => {
    return Message({
      message, type, duration
    })
  }
})

Vue.use(ElementUI)

Vue.config.productionTip = false
Vue.prototype.$message = message

new Vue({
  render: h => h(App),
}).$mount('#app')
