import { Pie } from 'vue-chartjs'

export default {
    name: 'PieChart',
    components: {Pie},
    computed: {
	chartData() {
	    return /* mutable chart data */
	},
	chartOptions() {
	    return /* mutable chart options */
	}
    },
  props: ['options'],
  mounted () {
    // eslint-disable-next-line
    Chart.defaults.global.defaultFontColor = '#fff'

    // this.chartData is created in the mixin.
    // If you want to pass options please create a local options object
    this.renderChart(this.chartData, this.options)
  }
}
