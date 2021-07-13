import ClipBoard from './src/ClipBoard'

// 方法的第一个参数是传入的Vue，第二个参数可以插件的自定义参数
ClipBoard.install = function (Vue) {
  Vue.component(ClipBoard.name, ClipBoard)
}

export default ClipBoard
