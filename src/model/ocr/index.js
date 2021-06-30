import Model from '../index'

class OcrModel extends Model {

  fetchGeneralBasicOCR(options) {
    options.url = '/ocr/GeneralBasicOCR'
    return this.post(options)
  }

  fetchRecognizeTableOCR(options) {
    options.url = '/ocr/RecognizeTableOCR'
    return this.post(options)
  }

}

const ocrModel = new OcrModel()
export default ocrModel
