const getImgBase64 = (imgSrc) => {
  return new Promise(resolve => {
    let img = new Image()
    img.src = imgSrc
    img.onload = () => {
      let base64 = image2Base64(img)
      console.log(base64)
      resolve(base64)
    }
  })
}

const image2Base64 = (img) => {
  let canvas = document.createElement('canvas')
  canvas.width = img.width
  canvas.height = img.height
  let ctx = canvas.getContext('2d')
  ctx.drawImage(img, 0, 0, img.width, img.height)
  let dataURL = canvas.toDataURL('image/png')
  return dataURL
}

export {
  getImgBase64,
  image2Base64,
}
