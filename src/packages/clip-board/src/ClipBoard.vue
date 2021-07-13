<template>
  <div class="canvas-container">
    <div class="canvas-box">
      <!--  基础画布  -->
      <canvas id="basicCanvas"></canvas>
      <!--  原始画布  -->
      <canvas id="originalCanvas" v-show="false"></canvas>
      <!--  用于将裁剪区域二进制数据转换成base64  -->
      <canvas id="transCanvas" v-show="false"></canvas>
      <!--   菜单   -->
      <div class="menu-box" v-if="menuParam.isShow" :style="{left: menuParam.left, top: menuParam.top}">
        <span id="yes" @click="handleOCR">识别</span> |
        <span id="no" @click="cancelCurrentOCRArea">取消</span>
      </div>
    </div>
    <!--  翻页  -->
    <div class="canvas-btn-box" v-if="basicImgList.length > 1">
      <el-button :disabled="!basicImgIndex" @click="changeBasicImg(-1)">上一页</el-button>
      <el-button :disabled="basicImgIndex === basicImgList.length - 1" @click="changeBasicImg(1)">下一页</el-button>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ClipBoard',
  props: {
    // ocr类型：通用文字识别、表格识别
    ocrType: {
      type: String,
      default: 'common'
    },
    // 图片路径
    basicImgList: {
      type: Array,
      isRequired: true
    },
    // ocr接口请求函数
    fetchGeneralOCR: {
      type: Function,
      isRequired: true
    },
    // 展示画布的最大宽度
    maxBasicCanvasW: {
      type: Number,
      default: 800
    },
    // 展示画布的最大高度
    maxBasicCanvasH: {
      type: Number,
      default: 900
    }
  },
  data() {
    return {
      // 当前展示的画布
      canvas: null,
      ctx: null,

      // 原始Canvas，根据图像原始大小进行绘制
      originalCanvas: null,
      originalCanvasCtx: null,

      // 中转Canvas，用于将 Canvas ImageData 转换成 base64
      transCanvas: null,
      transCanvasCtx: null,

      // 缩放比例
      canvasScaleRatio: [],

      // 当前展示图片
      // 大小
      basicImgSize: [],
      basicImgIndex: 0,
      // 二进制数据
      basicImgData: [],

      // 原始图片信息
      // 大小
      originalBasicImgSize: [],
      // 二进制数据
      originalBasicImgData: [],
      // 用于判断是否需要更新 originalCanvas，默认为false（第一次渲染会主动更新）
      needUpdateOriginalCanvas: false,

      // 是否可以开始 "画" 识别区域
      canSetArea: false,

      // 当前识别区域
      // 起始坐标
      originPos: [0, 0],
      // 大小
      areaSize: [0, 0],
      // key count
      ocrClipKeyCount: 1000,
      // 区域集合，[[{ key, x, y, width, height }]]
      ocrImgStack: [],
      ocrImgBase64Map: [],

      // 最近一次画布的渲染结果
      latestCanvasBackUp: [],
      // 菜单选项
      menuParam: {
        isShow: false,
        left: 0,
        top: 0
      },

      // 裁剪区域最小宽高值
      miniBoundary: 5,
      isOcrLockIn: true,

      // 表格数据Col，Y方向上可接受的最小误差
      miniColPolygonY: 5,
    }
  },
  mounted() {
    // 初始化数据结构
    let len = this.basicImgList.length
    this.canvasScaleRatio = Array.from(new Array(len), () => 1)
    this.basicImgSize = Array.from(new Array(len), () => [0, 0])
    this.basicImgData = Array.from(new Array(len), () => null)

    this.originalBasicImgSize = Array.from(new Array(len), () => [0, 0])
    this.originalBasicImgData = Array.from(new Array(len), () => null)

    this.ocrImgStack = Array.from(new Array(len), () => [])
    this.ocrImgBase64Map = Array.from(new Array(len), () => ({}))
    this.latestCanvasBackUp = Array.from(new Array(len), () => null)

    // 初始化基础画布
    this.init()
    // 获取原始 Canvas 实例
    this.originalCanvas = document.getElementById('originalCanvas')
    this.originalCanvasCtx = this.originalCanvas.getContext('2d')
    // 获取中转 Canvas 实例
    this.transCanvas = document.getElementById('transCanvas')
    this.transCanvasCtx = this.transCanvas.getContext('2d')
  },
  methods: {
    // 初始化
    init() {
      let canvas = document.getElementById('basicCanvas')
      if (!canvas.getContext) return '不支持 canvas'
      this.canvas = canvas
      this.ctx = canvas.getContext('2d')
      this.drawTemplate()

      this.canvas.addEventListener('mousedown', this.mousedownHandler.bind(this), false)
      this.canvas.addEventListener('mousemove', this.mousemoveHandler.bind(this), false)
      this.canvas.addEventListener('mouseup', this.mouseupHandler.bind(this), false)
    },

    // 设置画布大小
    setCanvasSize([width, height], targetEl = 'canvas') {
      this[targetEl].width = width
      this[targetEl].height = height
    },

    // 绘制初始化基础图片
    drawTemplate() {
      let basicImgIndex = this.basicImgIndex

      if (this.latestCanvasBackUp[basicImgIndex]) {
        this.setCanvasSize(this.basicImgSize[basicImgIndex])
        this.ctx.putImageData(this.latestCanvasBackUp[basicImgIndex], 0, 0)
        this.needUpdateOriginalCanvas = true
      } else {
        let img = new Image()
        img.onload = () => {
          let { width, height } = img
          // 将原始大小的图像画到 originalCanvas 上
          this.setCanvasSize([width, height], 'originalCanvas')
          this.originalCanvasCtx.drawImage(img, 0, 0, width, height)
          this.originalBasicImgSize[basicImgIndex] = [width, height]
          this.originalBasicImgData[basicImgIndex] = this.originalCanvasCtx.getImageData(0, 0, width, height)

          // 判断是否需要缩放
          if (width > this.maxBasicCanvasW || height > this.maxBasicCanvasH) {
            let ratioW = Math.floor(this.maxBasicCanvasW / width * 100) / 100
            let ratioH = Math.floor(this.maxBasicCanvasH / height * 100) / 100
            let scaleRatio = this.judgeNumMaxOrMin(ratioW, ratioH, 'mini')
            this.canvasScaleRatio[basicImgIndex] = scaleRatio
            width = this.computeProduct([width, scaleRatio])
            height = this.computeProduct([height, scaleRatio])
          }

          this.setCanvasSize([width, height], 'canvas')
          this.basicImgSize[basicImgIndex] = [width, height]
          this.ctx.drawImage(img, 0, 0, width, height)
          this.setLatestCanvasBackUp(basicImgIndex)
        }
        img.src = this.basicImgList[basicImgIndex]
      }
    },

    // 鼠标按下
    mousedownHandler(e) {
      if (this.isOcrLockIn) return false
      this.canSetArea = true
      this.originPos = [e.offsetX, e.offsetY]
    },

    // 鼠标移动
    mousemoveHandler(e) {
      if (this.canSetArea) {
        if (this.menuParam.isShow) this.menuParam.isShow = false
        this.areaSize = [e.offsetX - this.originPos[0] , e.offsetY - this.originPos[1]]
        this.updateCanvas()
        this.ctx.strokeRect(this.originPos[0], this.originPos[1], this.areaSize[0], this.areaSize[1])
      }
    },

    // 鼠标松开
    mouseupHandler(e) {
      this.canSetArea = false
      // 存在实际可识别区域时，打开操作菜单
      if (Math.abs(this.areaSize[0]) >= this.miniBoundary && Math.abs(this.areaSize[1]) >= this.miniBoundary) {
        this.menuParam = {
          isShow: true,
          left: `${e.clientX}px`,
          top: `${e.clientY}px`
        }
      } else if (this.areaSize[0] && this.areaSize[1]) {
        this.$message?.warning('请画出有效识别区域')
        this.updateCanvas()
      } else {
        this.$message?.warning('请先选择对应的项')
      }
    },

    // 渲染最近一次保存的渲染结果
    updateCanvas(basicImgIndex = this.basicImgIndex) {
      if (this.latestCanvasBackUp[basicImgIndex]) {
        this.ctx.putImageData(this.latestCanvasBackUp[basicImgIndex], 0, 0)
      }
    },

    /**
     * 保存对应下标的，最近一次展示画布的渲染结果
     *
     * @param basicImgIndex 下标
     */
    setLatestCanvasBackUp(basicImgIndex) {
      let realCtx = 'ctx'
      if (this.basicImgIndex !== basicImgIndex) realCtx = 'transCanvasCtx'

      let imgData = this[realCtx].getImageData(0, 0, this.basicImgSize[basicImgIndex][0], this.basicImgSize[basicImgIndex][1])
      this.latestCanvasBackUp[basicImgIndex] = imgData

      // 保存基础图片的数据
      if (!this.basicImgData[basicImgIndex]) this.basicImgData[basicImgIndex] = imgData
    },

    /**
     * 将识别区域从 原始Canvas 上，画到 transCanvas 上
     *
     * @return base64
     */
    setTransCanvasToBase64() {
      let basicImgIndex = this.basicImgIndex
      let x = this.computeDivision(this.originPos[0], this.canvasScaleRatio[basicImgIndex])
      let y = this.computeDivision(this.originPos[1], this.canvasScaleRatio[basicImgIndex])
      let width = this.computeDivision(this.areaSize[0], this.canvasScaleRatio[basicImgIndex])
      let height = this.computeDivision(this.areaSize[1], this.canvasScaleRatio[basicImgIndex])

      // 需要重新渲染 originalCanvas
      if (this.needUpdateOriginalCanvas) {
        this.setCanvasSize(this.originalBasicImgSize[basicImgIndex], 'originalCanvas')
        this.originalCanvasCtx.putImageData(this.originalBasicImgData[basicImgIndex], 0, 0)
        this.needUpdateOriginalCanvas = false
      }
      let currentOcrImgData = this.originalCanvasCtx.getImageData(x, y, width, height)

      this.setCanvasSize([currentOcrImgData.width, currentOcrImgData.height], 'transCanvas')
      this.transCanvasCtx.putImageData(currentOcrImgData, 0, 0)
      let base64 = this.transCanvas.toDataURL('image/png', 1)
      this.ocrImgBase64Map[this.basicImgIndex][this.ocrClipKeyCount] = base64

      return base64
    },

    /**
     * 文字识别
     *
     * @param isReOcr 是否是重新识别
     * @param clipKey 需要重新识别区域对应的key
     */
    generalOCR(isReOcr = false, basicImgIndex = this.basicImgIndex, clipKey = 0) {
      if (this.isOcrLockIn && !isReOcr) return false

      let transCanvasBase64 = ''
      if (isReOcr) {
        let imgData = this.ocrImgBase64Map[basicImgIndex][clipKey]
        if (!imgData) return false
        transCanvasBase64 = imgData
      } else transCanvasBase64 = this.setTransCanvasToBase64()

      this.fetchGeneralOCR(transCanvasBase64).then(datas => {
        if (!isReOcr) {
          this.ocrImgStack[this.basicImgIndex].push({
            key: this.ocrClipKeyCount,
            x: this.originPos[0],
            y: this.originPos[1],
            width: this.areaSize[0],
            height: this.areaSize[1]
          })

          this.isOcrLockIn = true
          this.setLatestCanvasBackUp(basicImgIndex)
          // 重置
          this.originPos = [0, 0]
          this.areaSize = [0, 0]
          this.menuParam.isShow = false
        }
        console.log('ocrImgStack：', this.ocrImgStack)

        switch (this.ocrType) {
          case 'common': {
            let actualRes = this.basicDataFormat(datas.TextDetections || [])
            this.$emit('getBasicOCR', {
              actualRes,
              currentOcrClipKey: clipKey || this.ocrClipKeyCount,
              basicImgIndex
            })
            break
          }
          case 'table': {
            let _TableDetections = datas.TableDetections || []
            _TableDetections = _TableDetections.filter(item => !!item.Type)
            let formatRes = this.tableDataFormat(_TableDetections)
            this.$emit('getTableOCR', {
              formatRes,
              currentOcrClipKey: clipKey || this.ocrClipKeyCount,
              basicImgIndex
            })
            break
          }
          default:
            return
        }
      })
    },

    /**
     * 解除关联
     *
     * @param basicImgIndex basicImgList的下标
     * @param relieveKey 需要解除关联的区域对应的key
     */
    relieveRelationOCR(basicImgIndex, relieveKey) {
      if (Object.prototype.hasOwnProperty.call(this.ocrImgBase64Map[basicImgIndex], relieveKey)) delete this.ocrImgBase64Map[basicImgIndex][relieveKey]
      if (this.ocrImgStack[basicImgIndex].length) this.ocrImgStack[basicImgIndex] = this.ocrImgStack[basicImgIndex].filter(item => item.key !== relieveKey)

      let realCtx = 'ctx'
      // 当前解除关联区域所在的下标，与当前下标不一致时，通过中转Canvas进行处理
      if (this.basicImgIndex !== basicImgIndex) {
        realCtx = 'transCanvasCtx'
        this.setCanvasSize(this.basicImgSize[basicImgIndex], 'transCanvas')
      }
      this[realCtx].putImageData(this.basicImgData[basicImgIndex], 0, 0)

      this.ocrImgStack[basicImgIndex].forEach(item => {
        this[realCtx].strokeRect(item.x, item.y, item.width, item.height)
      })
      this.setLatestCanvasBackUp(basicImgIndex)
    },

    handleOCR() {
      this.generalOCR(false)
    },

    // 暴露方法：重新识别
    handleReGeneralOCR(basicImgIndex, clipKey) {
      if (!(typeof basicImgIndex === 'number' && basicImgIndex >= 0)) {
        this.$message?.error('无效 basicImgIndex')
        return false
      }
      if (!clipKey) {
        this.$message?.error('无效 clipKey')
        return false
      }
      this.generalOCR(true, basicImgIndex, clipKey)
    },

    cancelCurrentOCRArea() {
      this.updateCanvas()
      this.menuParam.isShow = false
    },

    // 生成key，且允许用户进行区域选择
    generateKeyToClip() {
      this.ocrClipKeyCount++
      this.isOcrLockIn = false // 取消锁定

      return this.ocrClipKeyCount
    },

    /**
     * 格式化通用文字识别结果
     *
     * @param {array} TextDetections
     */
    basicDataFormat(TextDetections) {
      let actualRes = ''
      if (TextDetections.length) TextDetections.forEach(item => actualRes += item.DetectedText)

      return actualRes
    },

    /**
     * 格式化表格识别结果
     *
     * @param {array} TableDetections
     */
    tableDataFormat(TableDetections) {
      let formatRes = []
      let maxColNum = 0
      TableDetections.forEach(item => {
        let cellList = item.Cells || []
        if (cellList.length) {
          let tableList = []
          // 基准值
          let referenceVal = cellList[0]?.Polygon[0]?.Y || 0
          // 每一行包含的col
          let perRowList = []
          cellList.forEach((cellItem, cellIndex) => {
            if (this.judgeColToSameLevel(referenceVal, cellItem.Polygon[0].Y)) {
              perRowList.push(cellItem.Text)
              if (cellIndex === cellList.length - 1) {
                tableList.push(perRowList)
                maxColNum = this.judgeNumMaxOrMin(maxColNum, perRowList.length)
              }
            } else {
              tableList.push(perRowList)
              maxColNum = this.judgeNumMaxOrMin(maxColNum, perRowList.length)
              perRowList = [cellItem.Text]
              referenceVal = cellItem.Polygon[0].Y || 0
            }
          })
          formatRes.push({
            tableList,
            maxColNum
          })
        }
      })
      return formatRes
    },

   /**
     * 判断当前col和上一个col，是否是同一层
     *
     * @param {number} preY
     * @param {number} nextY
     */
    judgeColToSameLevel(preY, nextY) {
      return Math.abs(preY - nextY) <= this.miniColPolygonY
    },

    judgeNumMaxOrMin(num1, num2, type = 'max') {
      if (type === 'max') return num1 > num2 ? num1 : num2
      return num1 <= num2 ? num1 : num2
    },

    /**
     * 计算乘积
     *
     * @param arr
     * @return {number}
     */
    computeProduct(arr) {
      let count = 1
      let decimal = ''
      let temp_arr = arr.map(item => {
        decimal = String(item).split('.')
        if (decimal[1] && decimal[1].length) {
          count *= 10 ** decimal[1].length
          return decimal[0] + decimal[1]
        } else return item
      })
      let product = temp_arr.reduce((accumulator, currentValue) => accumulator * currentValue)
      let result = product / count
      return result
    },

    /**
     * 计算除法
     *
     * @param num1 被除数
     * @param num2 除数
     */
    computeDivision(num1, num2) {
      return num1 / num2
    },

    changeBasicImg(val) {
      this.basicImgIndex += val
      this.menuParam.isShow = false
      this.drawTemplate()
    }
  }
}
</script>

<style scoped>
.canvas-box {
  border: 1px solid lightgrey;
}
.menu-box {
  position: absolute;
  padding: 3px 6px;
  border: 1px solid grey;
  background: skyblue;
}
span {
  cursor: pointer;
}
.canvas-btn-box {
  margin-top: 10px;
}
</style>
