import { useEffect, useMemo, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from './firebase';

const norm = (value) => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
const digits = (value) => String(value ?? '').replace(/\D/g, '');
const getMatricula = (row) => row?.matricula ?? row?.['Matrícula'] ?? row?.['Matricula'] ?? row?.['MATRÍCULA'] ?? '';
const getCpf = (row) => row?.cpf ?? row?.CPF ?? '';
const getNome = (row) => row?.nome ?? row?.Nome ?? '';
const keyOf = (row) => {
  const matricula = norm(getMatricula(row));
  const cpf = digits(getCpf(row));
  if (matricula) return 'matricula:' + matricula;
  if (cpf) return 'cpf:' + cpf;
  return '';
};
const labelOf = (row) => {
  const nome = getNome(row) || 'Nome não informado';
  const matricula = getMatricula(row);
  return matricula ? `${nome} · Matrícula ${matricula}` : nome;
};

export default function PainelConferenciaIntegracoes({ modulo }) {
  const [dados, setDados] = useState({ condutores: [], ticketlog: [], cobli: [] });
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    let ativo = true;
    setLoading(true);
    setErro('');
    Promise.all(['funcionarios', 'condutores', 'ticketlog', 'cobli'].map(async (nome) => {
      const snapshot = await getDocs(collection(db, nome));
      return [nome, snapshot.docs.map((item) => ({ __docId: item.id, ...item.data() }))];
    }))
      .then((entries) => {
        if (ativo) setDados(Object.fromEntries(entries));
      })
      .catch((error) => {
        console.error('Erro ao conferir cadastros integrados:', error);
        if (ativo) setErro('Não foi possível conferir as bases. Verifique a conexão e as permissões do Firestore.');
      })
      .finally(() => { if (ativo) setLoading(false); });
    return () => { ativo = false; };
  }, [refresh]);

  const relatorio = useMemo(() => {
    const condutores = dados.condutores || [];
    const ticketlog = dados.ticketlog || [];
    const cobli = dados.cobli || [];
    const condutoresComChave = condutores.filter((r) => keyOf(r));
    const ticketComChave = ticketlog.filter((r) => keyOf(r));
    const cobliComChave = cobli.filter((r) => keyOf(r));
    const ticketKeys = new Set(ticketComChave.map(keyOf));
    const condutorKeys = new Set(condutoresComChave.map(keyOf));
    const cobliKeys = new Set(cobliComChave.map(keyOf));
    const ticketAusentes = condutoresComChave.filter((r) => !ticketKeys.has(keyOf(r)));
    const ticketExtras = ticketComChave.filter((r) => !condutorKeys.has(keyOf(r)));
    const cobliAusentes = condutoresComChave.filter((r) => !cobliKeys.has(keyOf(r)));
    const cobliExtras = cobliComChave.filter((r) => !condutorKeys.has(keyOf(r)));
    const semIbutton = cobli.filter((r) => !String(r['Identificador'] ?? r['iButton'] ?? r['IBUTTON'] ?? '').trim());
    const semChave = {
      condutores: condutores.filter((r) => !keyOf(r)).length,
      ticketlog: ticketlog.filter((r) => !keyOf(r)).length,
      cobli: cobli.filter((r) => !keyOf(r)).length,
    };
    return { ticketAusentes, ticketExtras, cobliAusentes, cobliExtras, condutoresSemFuncionario, semIbutton, semChave, totals: { funcionarios: funcionarios.length, condutores: condutores.length, ticketlog: ticketlog.length, cobli: cobli.length } };
  }, [dados]);

  if (modulo !== 'condutores' && modulo !== 'ticketlog' && modulo !== 'cobli') return null;
  const ticket = modulo === 'ticketlog';
  const missing = ticket ? relatorio.ticketAusentes : relatorio.cobliAusentes;
  const extra = ticket ? relatorio.ticketExtras : relatorio.cobliExtras;
  const title = ticket ? 'Conferência Condutores × Ticket Log' : 'Conferência Condutores × Cobli';
  const renderList = (rows, empty) => rows.length ? (
    <ul className="mt-2 space-y-1 text-sm">{rows.slice(0, 8).map((r, i) => <li key={r.__docId || keyOf(r) || i}>{labelOf(r)}</li>)}{rows.length > 8 && <li className="text-xs opacity-70">+ {rows.length - 8} registro(s) adicional(is)</li>}</ul>
  ) : <p className="mt-2 text-sm opacity-70">{empty}</p>;

  return (
    <section className="my-5 rounded-xl border border-slate-200 bg-white p-4 shadow-sm" aria-label={title}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div><span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Qualidade dos cadastros</span><h2 className="mt-1 text-lg font-semibold text-slate-900">{title}</h2><p className="mt-1 text-sm text-slate-600">A matrícula é a chave principal de conferência; CPF é usado como alternativa quando a matrícula não está disponível.</p></div>
        <button type="button" onClick={() => setRefresh((n) => n + 1)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-50">↻ Atualizar conferência</button>
      </div>
      {loading ? <p className="text-sm text-slate-600">Conferindo as bases…</p> : erro ? <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-800">{erro}</p> : <>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-lg bg-slate-50 p-3"><span className="text-sm text-slate-600">Condutores (base NextFleet)</span><strong className="mt-1 block text-2xl">{relatorio.totals.condutores.toLocaleString('pt-BR')}</strong></div>
          <div className="rounded-lg bg-slate-50 p-3"><span className="text-sm text-slate-600">{baseMae ? 'Condutores cadastrados no NextFleet' : ticket ? 'Registros Ticket Log' : 'Registros Cobli'}</span><strong className="mt-1 block text-2xl">{(baseMae ? relatorio.totals.condutores : ticket ? relatorio.totals.ticketlog : relatorio.totals.cobli).toLocaleString('pt-BR')}</strong></div>
          {baseMae && <div className="rounded-lg bg-slate-50 p-3"><span className="text-sm text-slate-600">Funcionários na base-mãe</span><strong className="mt-1 block text-2xl">{relatorio.totals.funcionarios.toLocaleString('pt-BR')}</strong></div>}\n          {!ticket && !baseMae && <div className="rounded-lg bg-amber-50 p-3"><span className="text-sm text-amber-900">Cobli sem iButton/identificador</span><strong className="mt-1 block text-2xl text-amber-900">{relatorio.semIbutton.length.toLocaleString('pt-BR')}</strong></div>}
          {baseMae && <div className="rounded-lg bg-amber-50 p-3"><span className="text-sm text-amber-900">Condutores sem funcionário correspondente</span><strong className="mt-1 block text-2xl text-amber-900">{relatorio.condutoresSemFuncionario.length.toLocaleString('pt-BR')}</strong></div>}\n          {ticket && <div className="rounded-lg bg-amber-50 p-3"><span className="text-sm text-amber-900">Divergências encontradas</span><strong className="mt-1 block text-2xl text-amber-900">{(relatorio.ticketAusentes.length + relatorio.ticketExtras.length).toLocaleString('pt-BR')}</strong></div>}
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
          <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-3"><h3 className="font-semibold text-amber-950">{baseMae ? 'Condutores que não foram encontrados na base-mãe' : ticket ? 'Em Condutores, mas não no Ticket Log' : 'Em Condutores, mas não na Cobli'}</h3>{renderList(missing, 'Nenhuma divergência identificada nesta direção.')}</div>
          {!baseMae && <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-3"><h3 className="font-semibold text-amber-950">{ticket ? 'No Ticket Log, mas não em Condutores' : 'Na Cobli, mas não em Condutores'}</h3>{renderList(extra, 'Nenhuma divergência identificada nesta direção.')}</div>}
          {!ticket && !baseMae && <div className="rounded-lg border border-rose-200 bg-rose-50/60 p-3 lg:col-span-2"><h3 className="font-semibold text-rose-950">Registros Cobli sem iButton/identificador</h3>{renderList(relatorio.semIbutton, 'Todos os registros Cobli possuem o campo Identificador preenchido.')}</div>}
        </div>
        {(relatorio.semChave.condutores + relatorio.semChave[baseMae ? 'condutores' : ticket ? 'ticketlog' : 'cobli']) > 0 && <p className="mt-3 text-xs text-slate-600">Atenção: existem registros sem matrícula e sem CPF, que não podem ser comparados com segurança. Condutores: {relatorio.semChave.condutores}; {baseMae ? 'Condutores' : ticket ? 'Ticket Log' : 'Cobli'}: {relatorio.semChave[baseMae ? 'condutores' : ticket ? 'ticketlog' : 'cobli']}.</p>}
      </>}
    </section>
  );
}
