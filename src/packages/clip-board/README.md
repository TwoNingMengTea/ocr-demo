# clipboard-ocr
> A clipboard-ocr component for Vue.js.

## Installation
```shell
npm i clipboard-ocr
```

## Usage
```vue
<ClipBoard
  ref="drawingBoard"
  ocrType="common"
  :basicImgList="basicImgList"
  :fetchGeneralOCR="fetchGeneralBasicOCR"
  @getBasicOCR="getBasicOCR"
  @getTableOCR="getTableOCR"
></ClipBoard>
```

### Attributes

| 参数      | 说明    | 类型      | 可选值       | 默认值   |
|---------- |-------- |---------- |-------------  |-------- |
| ref | 获取剪切板实例 | String | — | — |
| ocrType | 识别类型 | String | common/table | common |
| basicImgList | 需要识别的图片集合 | Array | — | — |
| maxBasicCanvasW | 画布的最大宽度 | Number | — | 800 |
| maxBasicCanvasH | 画布的最大高度 | Number | — | 900 |
| fetchGeneralOCR | ocr识别的函数 | Function | — | — |
| getBasicOCR | 基础识别回调 | Function | — | — |
| getTableOCR | 表格识别回调 | Function | — | — |

### Data Format

1. 基础识别（ocrType: common）
```javascript
[
  { basicImgIndex: 0, key: null, label: 'label', value: null },
]
```
* basicImgIndex：裁剪区域位于图片集合的项
* key：绑定裁剪区域的标识
* label：文字说明
* value：识别的内容

2. 表格识别（OCRType：table）
```javascript
[
  {
    basicImgIndex: 0,
    key: null,
    value: [
      {
        maxColNum: 3,
        tableList: [[x, x, x], [x], [x, x]]
      }
    ] 
  },
]
```
* basicImgIndex：裁剪区域位于图片集合的项
* key：绑定裁剪区域的标识
* value：
    * maxColNum：当前识别的表格拥有的最大列数
    * tableList：表格数据

### Function

1. generateKeyToClip(),
生成一个key，用于绑定裁剪区域。

2. handleReGeneralOCR(basicImgIndex, key),
调用ocr识别。
 
