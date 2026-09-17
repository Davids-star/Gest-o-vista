// echarts-setup.js — import tree-shaken do ECharts.
//
// Os 4 componentes de gráfico do app faziam `import * as echarts from
// 'echarts'`, que traz o pacote INTEIRO — todo tipo de gráfico (linha,
// scatter, mapa, 3D, etc.), todo componente e os dois renderers — mesmo
// o app só usando barra e pizza/doughnut. Isso inflava bastante o bundle
// principal (a maior fatia dele, na prática) — não é o gráfico em si que
// é lento pra desenhar, é o tempo de baixar + interpretar esse JS todo
// antes de QUALQUER coisa da tela poder rodar, o que dava a impressão de
// "demora pra aparecer o gráfico" (na real, a tela inteira demorava).
//
// Aqui só entra o que os 4 gráficos realmente usam: barra, pizza,
// grid/tooltip/legend, renderer canvas, e o tema 'dark' (usado por
// TimeDistributionChart/StationComparisonChart via `echarts.init(el, 'dark')`).
import * as echarts from 'echarts/core';
import { BarChart, PieChart } from 'echarts/charts';
import { GridComponent, TooltipComponent, LegendComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import darkTheme from 'echarts/theme/dark.js';

echarts.use([BarChart, PieChart, GridComponent, TooltipComponent, LegendComponent, CanvasRenderer]);
echarts.registerTheme('dark', darkTheme);

export default echarts;
