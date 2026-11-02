import { useEffect, useMemo, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from './firebase';

const dashboardCache = new Map();
const MODULOS = {
  condutores: { collection: 'condutores', title: 'Visão dos condutores', description: 'Acompanhe cadastro, habilitação e qualidade dos dados.', icon: '👤', metrics: [['Total cadastrado', 'total'], ['Ativos', 'ativos'], ['CNH a verificar', 'cnh'], ['Dados incompletos', 'incompletos']] },
  veiculos: { collection: 'veiculos', title: 'Visão da frota', description: 'Entenda a composição da frota e identifique itens que precisam de atenção.', icon: '🚘', metrics: [['Veículos cadastrados', 'total'], ['Ativos', 'ativos'], ['Em atenção', 'atencao'], ['Dados incompletos', 'incompletos']] },
  funcionarios: { collection: 'funcionarios', title: 'Visão de funcionários', description: 'Resumo do cadastro e da qualidade das informações.', icon: '🧑‍💼', metrics: [['Total cadastrado', 'total'], ['Ativos', 'ativos'], ['Inativos', 'inativos'], ['Dados incompletos', 'incompletos']] },
  ticketlog: { collection: 'ticketlog', title: 'Painel de conferência Ticket Log', description: 'Compare os condutores cadastrados com os usuários liberados para abastecimento.', icon: '🎫', metrics: [['Cadastros Ticket Log', 'total'], ['Condutores sem Ticket Log', 'semIntegracao'], ['Ticket Log sem condutor', 'semCondutor'], ['Registros sem matrícula', 'semMatricula']] },
  cobli: { collection: 'cobli', title: 'Painel de conferência Cobli', description: 'Confira se cada condutor possui cadastro na telemetria e identificador iButton.', icon: '📡', metrics: [['Cadastros Cobli', 'total'], ['Condutores sem Cobli/iButton', 'semIntegracao'], ['Cobli sem condutor', 'semCondutor'], ['Sem identificador iButton', 'semIbutton']] },
  multas: { collection: 'multas', title: 'Painel de multas', description: 'Priorize processos em aberto, prazos e registros que precisam de revisão.', icon: '🚨', metrics: [['Infrações cadastradas', 'total'], ['Em acompanhamento', 'abertas'], ['Prazo legal vencido', 'vencidas'], ['Enviadas ao RH', 'rh']] },
};
const norm = (value) => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
const first = (row, keys) => {
  const entries = Object.entries(row || {});
  for (const key of keys) {
    const found = entries.find(([name, value]) => norm(name) === norm(key) && value !== undefined && value !== null && String(value).trim() !== '');
    if (found) return found[1];
  }
  return undefined;
};
const identity = (row) => {
  const matricula = norm(first(row, ['Matrícula', 'Matricula', 'matricula', 'Matrícula do condutor']));
  const cpf = norm(first(row, ['CPF', 'cpf']));
  const nome = norm(first(row, ['Nome', 'nome', 'Condutor', 'Condutor identificado']));
  return matricula ? 'matricula:' + matricula : cpf ? 'cpf:' + cpf : nome ? 'nome:' + nome : '';
};

function summarize(rows, key) {
  const statusKeys = ['status', 'Status', 'Status do Processo', 'Status Condutor', 'Status Veículo', 'Status Motorista', 'status no cadastro'];
  const cnhKeys = ['Validade CNH', 'Data de Validade CNH', 'validadeCNH', 'Validade da CNH', 'Vencimento da CNH'];
  const statusOf = (row) => norm(first(row, statusKeys));
  const total = rows.length;
  const ativos = rows.filter((row) => {
    const s = statusOf(row);
    return s.includes('ativo') || s === 'regular' || s === 'em andamento';
  }).length;
  const inativos = rows.filter((row) => {
    const s = statusOf(row);
    return s.includes('inativo') || s.includes('desativado') || s.includes('demitido');
  }).length;
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  const cnh = rows.filter((row) => {
    const value = first(row, cnhKeys);
    if (!value) return false;
    const date = new Date(value);
    return !Number.isNaN(date.getTime()) && date < hoje;
  }).length;
  const incompletos = rows.filter((row) => {
    const campos = key === 'multas' ? ['AIT', 'ID', 'Placa do Veículo', 'Status do Processo'] : key === 'veiculos' ? ['Placa', 'Modelo'] : key === 'funcionarios' ? ['Nome', 'Matricula'] : ['Nome', 'Matrícula', 'nome', 'matricula'];
    return campos.filter((field) => !String(row[field] ?? '').trim()).length >= Math.min(2, campos.length);
  }).length;
  const abertas = rows.filter((row) => {
    const s = norm(first(row, ['Status do Processo', 'status', 'Status']));
    return s && !/(conclu|encerrad|finalizad|arquivad|cancelad)/.test(s);
  }).length;
  const vencidas = rows.filter((row) => {
    const status = norm(first(row, ['Etapa atual', 'Status do Processo', 'Status / Próxima ação', 'Prioridade']));
    if (status.includes('vencid')) return true;
    const value = first(row, ['Prazo legal para indicação', 'Prazo Limite Legal de Indicação', 'Prazo Acompanhamento', 'prazo']);
    if (!value) return false;
    const date = new Date(value);
    return !Number.isNaN(date.getTime()) && date < hoje && !/(conclu|encerrad|finalizad|arquivad)/.test(status);
  }).length;
  const rh = rows.filter((row) => norm(first(row, ['Etapa atual'])) === norm('Enviado ao RH')).length;
  return { total, ativos, inativos, cnh, incompletos, abertas, vencidas, rh };
}

export default function DashboardInteligente({ modulo }) {
  const config = MODULOS[modulo] || MODULOS.funcionarios;
  const [rows, setRows] = useState([]);
  const [relatedRows, setRelatedRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refresh, setRefresh] = useState(0);
  // Os painéis Ticket Log e Cobli comparam a integração com a lista de condutores.
  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(false);
    const needsComparison = modulo === 'ticketlog' || modulo === 'cobli';
    const requests = [getDocs(collection(db, config.collection))];
    if (needsComparison) requests.push(getDocs(collection(db, 'condutores')));
    Promise.all(requests)
      .then((snapshots) => {
        if (!alive) return;
        const ownRows = snapshots[0].docs.map((item) => item.data());
        const drivers = needsComparison ? snapshots[1].docs.map((item) => item.data()) : [];
        setRows(ownRows);
        setRelatedRows(drivers);
        dashboardCache.set(config.collection, { rows: ownRows, updatedAt: Date.now() });
      })
      .catch(() => { if (alive) { setRows([]); setRelatedRows([]); setError(true); } })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [config.collection, modulo, refresh]);
  const stats = useMemo(() => {
    const base = summarize(rows, modulo);
    if (modulo !== 'ticketlog' && modulo !== 'cobli') return base;
    const systemIds = new Set(rows.map(identity).filter(Boolean));
    const driverIds = new Set(relatedRows.map(identity).filter(Boolean));
    const semIntegracao = relatedRows.filter((driver) => {
      const id = identity(driver);
      if (!id || systemIds.has(id)) return false;
      return true;
    }).length;
    const semCondutor = rows.filter((record) => {
      const id = identity(record);
      return !id || !driverIds.has(id);
    }).length;
    const semMatricula = rows.filter((record) => !norm(first(record, ['Matrícula', 'Matricula', 'matricula']))).length;
    const semIbutton = modulo === 'cobli' ? rows.filter((record) => !String(first(record, ['Identificador', 'iButton', 'IBUTTON', 'Código do app']) ?? '').trim()).length : 0;
    const semIntegracaoFinal = modulo === 'cobli'
      ? relatedRows.filter((driver) => {
          const id = identity(driver);
          const cobli = rows.find((record) => id && identity(record) === id);
          return !cobli || !String(first(cobli, ['Identificador', 'iButton', 'IBUTTON', 'Código do app']) ?? '').trim();
        }).length
      : semIntegracao;
    return { ...base, semIntegracao: semIntegracaoFinal, semCondutor, semMatricula, semIbutton };
  }, [rows, relatedRows, modulo]);
  const descriptions = {
    total: 'Registros encontrados na base',
    ativos: 'Com status ativo/regular reconhecido',
    inativos: 'Com status inativo reconhecido',
    cnh: 'Validade identificada como vencida',
    incompletos: 'Registros com campos-chave ausentes',
    abertas: 'Processos sem status de conclusão reconhecido',
    vencidas: 'Prazo legal vencido e ainda em acompanhamento',
    rh: 'Etapa final do PPCM concluída',
    atencao: 'Registros com status de atenção',
    semIntegracao: modulo === 'cobli' ? 'Condutores sem cadastro completo ou iButton na Cobli' : 'Condutores sem cadastro de acesso ao abastecimento',
    semCondutor: 'Registros sem correspondência em Condutores',
    semMatricula: 'Cadastros sem matrícula para cruzamento confiável',
    semIbutton: 'Cadastros Cobli sem identificador preenchido',
  };
  const valueFor = (id) => id === 'atencao' ? rows.filter((r) => /(oficina|manutenc|bloquead|inativo|pendente)/.test(norm(first(r, ['Status', 'Status Veículo', 'Situação'])))).length : stats[id];
  return (
    <section className="smart-dashboard" aria-label={config.title}>
      <div className="smart-dashboard-heading">
        <div className="smart-heading-copy">
          <span className="smart-eyebrow">PAINEL INTELIGENTE</span>
          <h2>{config.title}</h2>
          <p>{config.description}</p>
        </div>
        <button className="smart-refresh" type="button" onClick={() => setRefresh((n) => n + 1)} aria-label="Atualizar indicadores">↻ <span>Atualizar</span></button>
      </div>
      {error && <div className="smart-notice">Não foi possível carregar os indicadores desta base. Confira a conexão e as permissões do Firestore.</div>}
      <div className="smart-metrics">
        {config.metrics.map(([label, key], index) => (
          <article className={'smart-metric metric-' + index} key={key}>
            <div className="smart-metric-top"><span>{label}</span><span className="smart-metric-icon">{['▦', '↗', '◷', '✓'][index]}</span></div>
            <strong>{loading ? '—' : Number(valueFor(key) || 0).toLocaleString('pt-BR')}</strong>
            <small>{descriptions[key] || 'Registros que podem exigir acompanhamento'}</small>
          </article>
        ))}
      </div>
      <div className="smart-insight"><span className="smart-insight-icon">✦</span><div><strong>{loading ? 'Analisando os dados…' : error ? 'Indicadores indisponíveis' : modulo === 'multas' ? (stats.vencidas ? 'Atenção aos prazos' : 'Acompanhe os processos até o RH') : stats.incompletos ? 'Oportunidade de melhorar a qualidade cadastral' : 'Base pronta para acompanhamento'}</strong><p>{loading ? 'Os indicadores serão exibidos após a leitura do Firestore.' : error ? 'Os números não foram estimados nem substituídos por dados fictícios.' : modulo === 'multas' ? (stats.vencidas ? stats.vencidas + ' processo(s) em acompanhamento aparentam estar com prazo legal vencido. Confira cada processo antes de agir.' : 'O indicador considera processos ainda não enviados ao RH e o campo de prazo legal. O fluxo do PPCM termina no envio ao RH.') : stats.incompletos ? stats.incompletos + ' registro(s) podem ter campos-chave ausentes. Use a busca do módulo para revisar os cadastros.' : 'Os números são calculados a partir dos documentos disponíveis nesta coleção.'}</p></div></div>
    </section>
  );
}
