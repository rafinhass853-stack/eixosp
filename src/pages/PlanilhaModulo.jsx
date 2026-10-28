import { FileSpreadsheet, Upload, Database, ArrowRight, Info } from 'lucide-react';

const descriptions = {
  condutores: ['Cadastro de condutores', 'Cadastro principal de motoristas, matrícula, habilitação, vínculo e situação operacional.'],
  funcionarios: ['Base de funcionários', 'Referência oficial de RH para conferência de matrícula, nome, função, unidade e situação.'],
  ticktlog: ['Cadastros Ticket Log', 'Conferência dos cadastros de abastecimento, centro de custo, unidade e validade de CNH.'],
  ibutton: ['iButton / Cobli', 'Consulta de identificadores, códigos de aplicativo, dados de CNH e vínculos de telemetria.'],
  gestaoManual: ['Gestão manual de infrações', 'Acompanhamento do fluxo de multas, indicação de condutor, validações e providências pendentes.'],
  gestaoCadastros: ['Gestão de cadastros', 'Conciliação entre RH, Condutores, Ticket Log, Cobli e demais fontes, destacando divergências.'],
  metas: ['Minhas metas', 'Acompanhamento de metas, resultados-chave e entregáveis operacionais.'],
  calculosFrota: ['Cálculos da frota', 'Painel de vencimentos e eventos críticos de veículos, com prioridades para documentos e manutenção.'],
  chartData: ['Dados dos gráficos', 'Base de apoio para indicadores, séries históricas e gráficos dos painéis.'],
  dadosBIMultas: ['Dados BI de multas', 'Indicadores de risco, ações recomendadas, fila de trabalho e distribuição das infrações.'],
  dadosAdministrativos: ['Dados administrativos', 'Visão consolidada de vínculos entre condutores, veículos, documentos e informações administrativas.'],
  hierarquia: ['Hierarquia de dados', 'Estrutura organizacional e níveis hierárquicos para análise e validação de responsáveis.'],
};

export default function PlanilhaModulo({moduleKey, onNavigate}) {
  const [title, description] = descriptions[moduleKey] || ['Módulo operacional', 'Área dedicada aos dados desta aba da planilha.'];
  return <div className="page-stack">
    <div className="welcome">
      <div><div className="eyebrow">MÓDULO / BASE DE REFERÊNCIA</div><h1>{title}</h1><p>{description}</p></div>
      <button className="button button-primary" onClick={() => onNavigate('importar')}><Upload size={16}/> Importar dados</button>
    </div>
    <div className="kpi-grid compact">
      <div className="kpi card"><div className="kpi-icon blue"><FileSpreadsheet size={20}/></div><div className="kpi-label">Origem</div><div className="kpi-value" style={{fontSize:20}}>Excel</div><div className="kpi-sub">Aba correspondente do arquivo Gestão Total</div></div>
      <div className="kpi card"><div className="kpi-icon violet"><Database size={20}/></div><div className="kpi-label">Integração</div><div className="kpi-value" style={{fontSize:20}}>A configurar</div><div className="kpi-sub">Mapeamento seguro para a base do PPCM/Eixo SP</div></div>
      <div className="kpi card"><div className="kpi-icon amber"><Info size={20}/></div><div className="kpi-label">Próxima etapa</div><div className="kpi-value" style={{fontSize:20}}>Conferir</div><div className="kpi-sub">Pré-visualizar os registros antes de gravar</div></div>
    </div>
    <section className="card import-panel">
      <div className="section-heading"><div><h2>Esta área corresponde a uma aba da planilha</h2><p>O menu já está preparado; os dados precisam ser importados e associados aos campos corretos antes de aparecerem aqui.</p></div></div>
      <div className="safe-note"><Info size={18}/><span>Por segurança, esta tela não altera nem apaga registros existentes. Use a importação com prévia para validar os cabeçalhos e as regras de correspondência antes de gravar.</span></div>
      <div style={{marginTop:18}}><button className="button button-primary" onClick={() => onNavigate('importar')}>Abrir importação <ArrowRight size={16}/></button></div>
    </section>
  </div>;
}
