import { BarChart3, Hash, PieChart } from 'lucide-react';
import { Page } from '../../../shared/components/layout/Page.jsx';
import ReportCard from '../components/ReportCard.jsx';

function Reports() {
  return (
    <Page>
      <section className="list-surface divide-y divide-border-default/40">
        <ReportCard
          icon={BarChart3}
          title="Balances"
          description="Ingresos, gastos y balance neto por mes y año"
          to="/reports/balances"
        />
        <ReportCard
          icon={PieChart}
          title="Gastos por categoría"
          description="Distribución de gastos entre categorías en el período que elijas"
          to="/reports/gastos-por-categoria"
        />
        <ReportCard
          icon={Hash}
          title="Frecuencia de gastos"
          description="Las categorías con mayor cantidad de transacciones"
          to="/reports/frecuencia"
        />
      </section>
    </Page>
  );
}

export default Reports;
