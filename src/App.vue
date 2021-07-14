<template>
  <div id="app">
    <ClipBoard
            ref="clipBoard"
            :ocrType="ocrType"
            :basicImgList="basicImgList"
            :fetchGeneralOCR="fetchGeneralBasicOCR"
            @getBasicOCR="getBasicOCR"
            @getTableOCR="getTableOCR"
    ></ClipBoard>
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
        <el-button @click="printTableData">打印表格数据</el-button>
        <div class="table-box" v-for="(tableItem, tableIndex) in tableOCR" :key="`tableItem${tableIndex}`">
          <div class="table-btn-box">
            <div class="title">表格</div>
            <el-button @click="setTableOCR(tableItem, tableIndex)">识别</el-button>
            <el-button @click="deleteTableOCR(tableItem, tableIndex)">删除</el-button>
          </div>
          <div>
            <div class="table-item" v-for="(item, index) in tableItem.value" :key="`table${index}`">
              <div class="col-box" v-for="(rowItem, rowIndex) in item.tableList" :key="`colBox${rowIndex}`">
                <div class="col" v-for="(colItem, colIndex) in rowItem" :key="colIndex">
                  <el-input v-model="rowItem[colIndex]" placeholder="请输入内容" @input="() => $forceUpdate()"></el-input>
                </div>
                <div class="col" v-if="rowIndex > 0">
                  <el-button type="text" @click="mergeTableRowToPre(tableIndex, index, rowIndex)">合并</el-button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import ClipBoard from 'clipboard-ocr'
import ocrModel from './model/ocr'

export default {
  name: 'App',
  components: {
    ClipBoard
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
        // require('@/assets/report3.png'),
      ],
      ocrType: 'common',
      tableOCR: [
        { key: null, value: [] },
        { key: null, value: [] },
        { key: null, value: [] }
      ]
    }
  },

  mounted() {
    console.log(typeof this.$refs.clipBoard)
  },

  methods: {
    setRelationOCR(item, index) {
      console.log(item)
      this.ocrType = 'common'
      if (item.key && item.value) { // 如果key存在，则表示当前操作为 重新识别
        this.$refs.clipBoard.handleReGeneralOCR(item.basicImgIndex, item.key)
      } else { // 不存在key，则表示当前操作为生成key
        this.inputList[index] = {
          ...item,
          key: this.$refs.clipBoard.generateKeyToClip()
        }
      }
    },
    deleteOCR(item, index) {
      if (!item.key) {
        this.$message.warning('当前项不可删除')
        return false
      }
      this.$refs.clipBoard.relieveRelationOCR(item.basicImgIndex, item.key)
      this.inputList[index] = {
        label: item.label,
        key: null,
        value: ''
      }
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
      let { formatRes, currentOcrClipKey, basicImgIndex } = option
      let currentIndex = this.tableOCR.findIndex(item => item.key === currentOcrClipKey)
      this.tableOCR[currentIndex] = {
        basicImgIndex,
        key: currentOcrClipKey,
        value: formatRes
      }
      console.log(this.tableOCR)
      this.$forceUpdate()
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
    setTableOCR(item, index) {
      this.ocrType = 'table'
      if (item.key && item.value?.length) {
        this.$refs.clipBoard.handleReGeneralOCR(item.basicImgIndex, item.key)
      }
      else this.tableOCR[index].key = this.$refs.clipBoard.generateKeyToClip()
    },

    // 删除
    deleteTableOCR(item, index) {
      if (!item.key) {
        this.$message.warning('当前项不可删除')
        return false
      }
      this.$refs.clipBoard.relieveRelationOCR(item.basicImgIndex, item.key)
      this.tableOCR[index] = {
        key: null,
        value: []
      }
      this.$forceUpdate()
    },

    // 表格合并
    mergeTableRowToPre(tableIndex, index, rowIndex) {
      let _table = this.tableOCR[tableIndex].value[index].tableList
      let targetRow = _table[rowIndex - 1]
      let sourceRow = _table[rowIndex]
      sourceRow.forEach((item, index) => {
        targetRow[index] = (targetRow[index] || '') + item
      })
      _table[rowIndex - 1] = targetRow
      _table.splice(rowIndex, 1)
      this.tableOCR[tableIndex].value[index].tableList = _table
      this.$forceUpdate()
    },

    printCommonData() {
      console.log(this.inputList)
    },

    printTableData() {
      console.log(this.tableOCR)
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
  margin: 10px;
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
.table-box {
  padding-bottom: 10px;
  margin: 10px;
  border-bottom: 1px solid lightgrey;
}
.table-btn-box {
  margin-bottom: 10px;
}
.title {
  margin-bottom: 10px;
}
.table-item {
  padding: 10px;
  margin-bottom: 10px;
  border: 1px solid skyblue;
}
</style>
