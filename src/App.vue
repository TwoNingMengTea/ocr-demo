<template>
  <div id="app">
    <DrawingBoard
            ref="drawingBoard"
            :ocrType="ocrType"
            :basicImgList="basicImgList"
            :fetchGeneralOCR="fetchGeneralBasicOCR"
            @getBasicOCR="getBasicOCR"
            @getTableOCR="getTableOCR"
    ></DrawingBoard>
    <div>
      <div>
        <el-button @click="printCommonData">打印</el-button>
        <div class="input-box" v-for="(item, index) in inputList" :key="item.key || index">
          <span>{{item.label}}</span>
          <el-input v-model="item.value" placeholder="请输入内容" @input="(value) => handleInput(value, item, index)">
            <div slot="suffix">
              <el-button type="text" @click="setRelationOCR(item, index)">识别</el-button>
              <el-button type="text" @click="deleteOCR(item, index)">删除</el-button>
            </div>
          </el-input>
        </div>
      </div>
      <div>
        <div>
          <div>表格</div>
          <el-button @click="setTableOCR">识别</el-button>
          <el-button @click="deleteTableOCR">删除</el-button>
          <el-button @click="printTableData">打印表格数据</el-button>
        </div>
        <div>
          <div v-for="(item, index) in this.tableOCR.value" :key="`table${index}`">
            <div class="col-box" v-for="(rowItem, rowIndex) in item.tableList" :key="`colBox${rowIndex}`">
              <div class="col" v-for="(colItem, colIndex) in rowItem" :key="colIndex">
                <el-input v-model="rowItem[colIndex]" placeholder="请输入内容"></el-input>
              </div>
              <div class="col" v-if="rowIndex > 1">
                <el-button type="text" @click="mergeTableRowToPre(index, rowIndex)">合并</el-button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import DrawingBoard from '@/components/DrawingBoard'
import ocrModel from './model/ocr'

export default {
  name: 'App',
  components: {
    DrawingBoard
  },
  data() {
    return {
      inputList: [
        { key: null, label: 'test1', value: null },
        { key: null, label: 'test2', value: null },
        { key: null, label: 'test3', value: null },
        { key: null, label: 'test4', value: null },
        { key: null, label: 'test5', value: null },
        { key: null, label: 'test6', value: null },
        { key: null, label: 'test7', value: null },
        { key: null, label: 'test8', value: null },
        { key: null, label: 'test9', value: null },
      ],
      basicImgList: [
        require('@/assets/report0.png'),
        require('@/assets/report1.png'),
        require('@/assets/report2.png'),
      ],
      ocrType: 'common',
      tableOCR: {
        key: null,
        value: []
      }
    }
  },
  methods: {
    setRelationOCR(item, index) {
      this.ocrType = 'common'
      let _item = { ...item }
      console.log(_item)
      if (_item.key && _item.value) { // 如果key存在，则表示当前操作为 重新识别
        this.$refs.drawingBoard.handleReGeneralOCR(_item.basicImgIndex, _item.key)
      } else { // 不存在key，则表示当前操作为生成key
        _item.key = this.$refs.drawingBoard.generateKeyToClip()
        this.inputList[index] = _item
      }
    },
    deleteOCR(item, index) {
      let _item = { ...item }
      if (!_item.key) {
        this.$message.warning('当前项不可删除')
        return false
      }
      this.$refs.drawingBoard.relieveRelationOCR(_item.basicImgIndex, _item.key)
      _item.key = null
      _item.value = ''
      this.inputList[index] = _item
      this.$forceUpdate()
    },
    /**
     * 获取通用文字识别结果
     *
     * @param {object} option
     * @param {string} option.actualRes 文字识别结果
     * @param {number} option.currentOcrClipKey 当前操作项对应的key值
     */
    getBasicOCR(option) {
      console.log(option)
      let { actualRes, currentOcrClipKey, basicImgIndex } = option
      let currentIndex = this.inputList.findIndex(item => item.key === currentOcrClipKey)
      this.inputList[currentIndex] = {
        basicImgIndex,
        key: currentOcrClipKey,
        label: this.inputList[currentIndex].label,
        value: actualRes
      }
      this.$forceUpdate()
    },

    getTableOCR(option) {
      console.log(option)
      this.tableOCR.value = option
    },

    /**
     * ocr接口调用
     *
     * @param imgBase64
     */
    fetchGeneralBasicOCR(imgBase64) {
      let ocrFetchKey = ''
      switch (this.ocrType) {
        case 'common':
          ocrFetchKey = 'fetchGeneralBasicOCR'
          break
        case 'table':
          ocrFetchKey = 'fetchRecognizeTableOCR'
          break
        default:
          return
      }
      return new Promise(resolve => {
        ocrModel[ocrFetchKey]({
          data: {
            ImageBase64: imgBase64
          }
        }).then(datas => resolve(datas))
      })
    },

    handleInput(value, item, index) {
      if (!value.trim() && item.key) { // 当存在key时，执行取消关联
        this.deleteOCR(item, index)
      }
      this.$forceUpdate()
    },

    // 表格识别
    setTableOCR() {
      this.ocrType = 'table'
      if (this.tableOCR.key && this.tableOCR.value) this.$refs.drawingBoard.handleReGeneralOCR(this.tableOCR.key)
      else this.tableOCR.key = this.$refs.drawingBoard.generateKeyToClip()
    },

    // 删除
    deleteTableOCR() {
      if (!this.tableOCR.key) {
        this.$message.warning('当前项不可删除')
        return false
      }
      this.$refs.drawingBoard.relieveRelationOCR(this.tableOCR.key)
      this.tableOCR = {
        key: null,
        value: []
      }
    },

    // 表格合并
    mergeTableRowToPre(tableIndex, rowIndex) {
      let _table = this.tableOCR.value[tableIndex].tableList
      let targetRow = _table[rowIndex - 1]
      let sourceRow = _table[rowIndex]
      sourceRow.forEach((item, index) => {
        targetRow[index] = targetRow[index] + item
      })
      _table[rowIndex - 1] = targetRow
      _table.splice(rowIndex, 1)
      this.tableOCR.value[tableIndex].tableList = _table
    },

    printCommonData() {
      console.log(this.inputList)
    },

    printTableData() {
      console.log(this.tableOCR.value)
    }
  }
}
</script>

<style scoped>
#app {
  display: flex;
}
.input-box {
  display: flex;
  align-items: center;
  margin-top: 15px;
  width: 400px;
}
span {
  margin-right: 10px;
}
.col-box {
  display: flex;
  margin-top: 20px;
}
.col {
  width: 150px;
}
</style>
