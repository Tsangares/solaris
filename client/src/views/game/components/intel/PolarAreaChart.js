import { PolarArea } from 'vue-chartjs'

export default {
  extends: PolarArea,
  props: ['options'],
  mounted () {
    // eslint-disable-next-line
    Chart.defaults.global.defaultFontColor = '#fff'

    // this.chartData is created in the mixin.
    // If you want to pass options please create a local options object
    this.renderChart(this.chartData, this.options)
  }
}
