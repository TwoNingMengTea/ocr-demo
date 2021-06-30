const CaseSensitivePathsPlugin = require('case-sensitive-paths-webpack-plugin')

module.exports = {
  configureWebpack: {
    resolve: {
      extensions: ['.js', '.vue', '.json', '.scss', '/Index.vue']
    },
    plugins: [
      new CaseSensitivePathsPlugin()
    ]
  }
}
