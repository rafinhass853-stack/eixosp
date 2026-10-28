import { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { FileSpreadsheet, Upload, Database, Info, RefreshCw, AlertCircle } from 'lucide-react';
import { db } from '../services/firebase';

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

// Nomes oficiais das seis coleções do PPCM no Firestore.
const collectionByModule = {
  condutores: 'condutores',
  funcionarios: 'funcionarios',
  ticktlog: 'cadastros_ticktlog',
  ibutton: 'ibutton_cobli',
  gestaoManual: 'infracoes',
  gestaoCadastros: 'condutores',
  dadosAdministrativos: 'funcionarios',
  dadosBIMultas: 'infracoes',
  chartData: 'infracoes',
  hierarquia: 'funcionarios',
};

const displayValue = value => {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

export default function PlanilhaModulo({ moduleKey, onNavigate }) {
  const [title, description] = descriptions[moduleKey] || ['Módulo operacional', 'Área dedicada aos dados desta aba da planilha.'];
  const collectionName = collectionByModule[moduleKey];
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(Boolean(collectionName));
  const [error, setError] = useState('');

  useEffect(() => {
    if (!collectionName) {
      setRecords([]);
      setLoading(false);
      setError('');
      return undefined;
    }
    setLoading(true);
    setError('');
    const unsubscribe = onSnapshot(
      collection(db, collectionName),
      snapshot => {
        setRecords(snapshot.docs.map(item => ({ ...item.data(), id: item.id })));
        setLoading(false);
        setError('');
      },
      err => {
        setLoading(false);
        setError(err?.code === 'permission-denied'
          ? 'Acesso negado pelas regras do Firestore. Confirme que entrou com a conta Google autorizada.'
          : (err?.message || 'Não foi possível ler esta coleção do Firestore.'));
      }
    );
    return unsubscribe;
  }, [collectionName]);

  const columns = useMemo(() => {
    const keys = new Set();
    records.slice(0, 50).forEach(record => Object.keys(record).forEach(key => {
      if (key !== '_importacao' && key !== 'createdAt' && key !== 'updatedAt') keys.add(key);
    }));
    return [...keys].slice(0, 10);
  }, [records]);

  return <div className="page-stack">
    <div className="welcome">
      <div><div className="eyebrow">MÓDULO / BASE DE REFERÊNCIA</div><h1>{title}</h1><p>{description}</p></div>
      <button className="button button-primary" onClick={() => onNavigate('importar')}><Upload size={16}/> Importar dados</button>
    </div>
    <div className="kpi-grid compact">
      <div className="kpi card"><div className="kpi-icon blue"><FileSpreadsheet size={20}/></div><div className="kpi-label">Origem</div><div className="kpi-value" style={{fontSize:20}}>Firestore</div><div className="kpi-sub">Dados carregados diretamente da base</div></div>
      <div className="kpi card"><div className="kpi-icon violet"><Database size={20}/></div><div className="kpi-label">Coleção</div><div className="kpi-value" style={{fontSize:16,overflowWrap:'anywhere'}}>{collectionName || 'Sem vínculo'}</div><div className="kpi-sub">Coleção de destino no Firebase</div></div>
      <div className="kpi card"><div className="kpi-icon amber"><Info size={20}/></div><div className="kpi-label">Registros lidos</div><div className="kpi-value">{loading ? '…' : records.length.toLocaleString('pt-BR')}</div><div className="kpi-sub">Atualização em tempo real</div></div>
    </div>
    <section className="card import-panel">
      <div className="section-heading"><div><h2>Dados da coleção</h2><p>Os registros são consultados no Firestore; esta tela não altera nem exclui dados.</p></div><button className="button button-ghost" onClick={() => onNavigate('importar')}><Upload size={15}/> Importar</button></div>
      {loading && <div className="notice"><RefreshCw size={17} className="spin"/> Lendo a coleção {collectionName}…</div>}
      {error && <div className="notice notice-error"><AlertCircle size={17}/><span>{error}</span></div>}
      {!loading && !error && !collectionName && <div className="safe-note"><Info size={18}/><span>Este módulo ainda não está associado a uma coleção específica do esquema principal.</span></div>}
      {!loading && !error && collectionName && records.length === 0 && <div className="preview-empty"><Database size={26}/><strong>Nenhum registro encontrado</strong><span>A leitura foi concluída, mas a coleção {collectionName} não retornou documentos para esta conta.</span></div>}
      {!loading && !error && records.length > 0 && <div className="table-wrap"><table><thead><tr>{columns.map(key => <th key={key}>{key}</th>)}</tr></thead><tbody>{records.map((record, index) => <tr key={record.id || index}>{columns.map(key => <td key={key} title={displayValue(record[key])}>{displayValue(record[key]).slice(0, 160)}</td>)}</tr>)}</tbody></table></div>}
      {records.length > 0 && <div className="safe-note"><Info size={17}/><span>Exibindo até 10 colunas para facilitar a consulta. A coleção mantém os campos originais no Firestore.</span></div>}
    </section>
  </div>;
}
