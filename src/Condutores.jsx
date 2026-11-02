// src/Condutores.jsx
import { useState, useEffect, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx';
import {
  collection, doc, getDoc, getDocs, setDoc, deleteDoc,
  writeBatch, serverTimestamp, query,
} from 'firebase/firestore';
import { db } from './firebase';
import PainelConferenciaIntegracoes from './PainelConferenciaIntegracoes';
import AnexosCadastro from './AnexosCadastro';
import {
  CAMPOS, CAMPOS_FORM, GRUPOS_CAMPOS,
  normalizarCPF, limparValor, labelDe, formatarCPF, parseData,
} from './schemaCondutores';

const COL = 'condutores';
const CACHE_TTL_MS = 5 * 60 * 1000;
let condutoresCache = { rows: null, updatedAt: 0 };

/* ============================================================
   COMPONENTE PRINCIPAL
============================================================ */
export default function Condutores() {
  const [aba, setAba] = useState('lista'); // lista | novo | importar
  const [condutores, setCondutores] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [toast, setToast] = useState(null);
  const [drawer, setDrawer] = useState(null); // { modo: 'view'|'edit', dados }

  const notificar = (msg, tipo = 'ok') => {
    setToast({ msg, tipo });
    setTimeout(() => setToast(null), 3500);
  };

  const carregar = async ({ force = false } = {}) => {
    if (!force && condutoresCache.rows && Date.now() - condutoresCache.updatedAt < CACHE_TTL_MS) {
      setCondutores(condutoresCache.rows);
      return;
    }
    setCarregando(true);
    try {
      // Não usar orderBy('nome'): documentos legados do NextFleet podem
      // guardar o nome como "Nome" (maiúsculo) ou "Condutor". O orderBy
      // excluiria silenciosamente todos os documentos sem o campo minúsculo.
      const snap = await getDocs(collection(db, COL));
      const rows = snap.docs.map((d) => {
        const data = d.data();
        return {
          ...data,
          cpf: data.cpf ?? data.CPF ?? d.id,
          nome: data.nome ?? data.Nome ?? data.Condutor ?? '',
          matricula: data.matricula ?? data['Matrícula'] ?? data['Matricula'] ?? '',
          cargo: data.cargo ?? data.Cargo ?? '',
          unidade: data.unidade ?? data.Unidade ?? '',
          status: data.status ?? data.Status ?? '',
          numeroCNH: data.numeroCNH ?? data['Número CNH'] ?? data['Numero CNH'] ?? '',
          categoriaCNH: data.categoriaCNH ?? data['Categoria CNH'] ?? '',
          validadeCNH: data.validadeCNH ?? data['Validade CNH'] ?? data['Data de Validade CNH'] ?? '',
        };
      }).sort((a, b) => String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-BR'));
      condutoresCache = { rows, updatedAt: Date.now() };
      setCondutores(rows);
    } catch (e) {
      console.error(e);
      notificar('Erro ao carregar: ' + e.message, 'bad');
    } finally {
      setCarregando(false);
    }
  };

  // A leitura assíncrona inicial precisa ocorrer uma única vez por montagem.
  // eslint-disable-next-line react-hooks/exhaustive-deps, react-hooks/set-state-in-effect
  useEffect(() => { carregar(); }, []);

  const filtrados = useMemo(() => {
    const t = busca.toLowerCase().trim();
    let arr = condutores;
    if (filtroStatus !== 'todos') {
      arr = arr.filter((c) => (c.status || '').toUpperCase() === filtroStatus);
    }
    if (!t) return arr;
    return arr.filter((c) =>
      [c.nome, c.matricula, c.cpf, c.cargo, c.unidade, c.numeroCNH]
        .some((v) => String(v || '').toLowerCase().includes(t)),
    );
  }, [busca, filtroStatus, condutores]);

  const excluir = async (cpf) => {
    if (!confirm('Excluir este condutor? Não pode ser desfeito.')) return;
    try {
      await deleteDoc(doc(db, COL, cpf));
      const rows = condutores.filter((item) => item.cpf !== cpf);
      condutoresCache = { rows, updatedAt: Date.now() };
      setCondutores(rows);
      notificar('Condutor excluído.');
    } catch (e) {
      notificar('Erro ao excluir: ' + e.message, 'bad');
    }
  };

  return (
    <div className="min-h-screen bg-surface text-ink font-sans">
      {/* Header */}
      <header className="bg-brand-600 text-white px-6 py-4 flex items-center justify-between shadow-md">
        <div>
          <h1 className="text-xl font-semibold">Condutores</h1>
          <p className="text-xs text-brand-100">
            {condutores.length} cadastrados · {filtrados.length} no filtro
          </p>
        </div>
        <nav className="flex gap-2 text-sm">
          {[
            { k: 'lista',    l: 'Lista' },
            { k: 'novo',     l: 'Novo condutor' },
            { k: 'importar', l: 'Importar planilha' },
          ].map(({ k, l }) => (
            <button
              key={k}
              onClick={() => setAba(k)}
              className={`px-4 py-2 rounded-md transition ${
                aba === k ? 'bg-white text-brand-700 font-semibold' : 'hover:bg-brand-500'
              }`}
            >
              {l}
            </button>
          ))}
        </nav>
      </header>

      <main className="p-6 max-w-7xl mx-auto">
        {aba === "lista" && <PainelConferenciaIntegracoes modulo="condutores" />}
        {aba === 'lista' && (
          <ListaView
            condutores={filtrados}
            totalGeral={condutores.length}
            busca={busca} setBusca={setBusca}
            filtroStatus={filtroStatus} setFiltroStatus={setFiltroStatus}
            carregando={carregando} onRecarregar={() => carregar({ force: true })}
            onVer={(c) => setDrawer({ modo: 'view', dados: c })}
            onEditar={(c) => setDrawer({ modo: 'edit', dados: c })}
            onExcluir={(c) => excluir(c.cpf)}
          />
        )}
        {aba === 'novo' && (
          <NovoView
            onSalvo={(row) => { atualizarLocal(row); setAba('lista'); }}
            notificar={notificar}
          />
        )}
        {aba === 'importar' && (
          <ImportarView
            onConcluido={(rows) => { atualizarLocal(rows); setAba('lista'); }}
            notificar={notificar}
          />
        )}
      </main>

      {drawer && (
        <Drawer
          modo={drawer.modo}
          dados={drawer.dados}
          onFechar={() => setDrawer(null)}
          onSalvo={(row) => { atualizarLocal(row); setDrawer(null); notificar('Condutor atualizado.'); }}
          notificar={notificar}
        />
      )}

      {toast && (
        <div
          className={`fixed bottom-6 right-6 px-4 py-3 rounded-lg shadow-lg text-white text-sm z-50 ${
            toast.tipo === 'bad' ? 'bg-bad' : toast.tipo === 'warn' ? 'bg-warn' : 'bg-ok'
          }`}
        >
          {toast.msg}
        </div>
      )}
    </div>
  );

  function atualizarLocal(rows) {
    const atualizacoes = Array.isArray(rows) ? rows : [rows];
    setCondutores((anteriores) => {
      const porCpf = new Map(anteriores.map((item) => [item.cpf, item]));
      atualizacoes.filter(Boolean).forEach((item) => porCpf.set(item.cpf, { ...porCpf.get(item.cpf), ...item }));
      const resultado = Array.from(porCpf.values());
      condutoresCache = { rows: resultado, updatedAt: Date.now() };
      return resultado;
    });
  }
}

/* ============================================================
   HELPERS
============================================================ */
function placeholderDe(key) {
  const map = {
    nome: 'Nome completo',
    cpf: '000.000.000-00',
    matricula: 'Matrícula',
    cargo: 'Cargo / função',
    unidade: 'Unidade / setor',
    numeroCNH: 'Número da CNH',
    categoriaCNH: 'A, B, AB, C, D, E...',
    validadeCNH: 'DD/MM/AAAA',
    status: 'ATIVO / INATIVO',
    observacaoCNH: 'Observações sobre a CNH...',
  };
  return map[key] || '';
}

function badgeCNH(validade) {
  if (!validade) return 'text-muted text-xs';
  const d = parseData(validade);
  if (!d) return 'text-muted text-xs';
  const hoje = new Date();
  const dias = Math.floor((d - hoje) / (1000 * 60 * 60 * 24));
  if (dias < 0) return 'px-2 py-0.5 rounded-full text-xs font-semibold bg-bad/10 text-bad';
  if (dias <= 30) return 'px-2 py-0.5 rounded-full text-xs font-semibold bg-warn/10 text-warn';
  return 'px-2 py-0.5 rounded-full text-xs font-semibold bg-ok/10 text-ok';
}

function StatusPill({ status }) {
  const s = (status || '').toUpperCase();
  if (s === 'ATIVO')
    return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-ok/10 text-ok">ATIVO</span>;
  if (s === 'INATIVO')
    return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-200 text-gray-700">INATIVO</span>;
  return <span className="text-muted text-xs">—</span>;
}

/* ============================================================
   LISTA
============================================================ */
function ListaView({
  condutores, totalGeral, busca, setBusca,
  filtroStatus, setFiltroStatus, carregando, onRecarregar,
  onVer, onEditar, onExcluir,
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      <div className="p-4 flex flex-wrap gap-3 items-center border-b border-gray-100">
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por nome, CPF, matrícula, cargo, CNH..."
          className="flex-1 min-w-[220px] px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
        />
        <select
          value={filtroStatus}
          onChange={(e) => setFiltroStatus(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm"
        >
          <option value="todos">Todos os status</option>
          <option value="ATIVO">Ativos</option>
          <option value="INATIVO">Inativos</option>
        </select>
        <button
          onClick={onRecarregar}
          className="px-4 py-2 text-sm bg-brand-600 text-white rounded-md hover:bg-brand-700"
        >
          Recarregar
        </button>
      </div>

      <div className="overflow-auto max-h-[72vh]">
        <table className="w-full text-sm">
          <thead className="bg-surface sticky top-0 z-10">
            <tr className="text-left text-muted uppercase text-xs">
              <th className="px-4 py-3">Nome</th>
              <th className="px-4 py-3">CPF</th>
              <th className="px-4 py-3">Matrícula</th>
              <th className="px-4 py-3">Cargo</th>
              <th className="px-4 py-3">Unidade</th>
              <th className="px-4 py-3">CNH</th>
              <th className="px-4 py-3">Validade</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {carregando && (
              <tr><td colSpan={9} className="p-8 text-center text-muted">Carregando…</td></tr>
            )}
            {!carregando && condutores.length === 0 && (
              <tr>
                <td colSpan={9} className="p-8 text-center text-muted">
                  {totalGeral === 0
                    ? 'Nenhum condutor cadastrado ainda. Use "Importar planilha" para começar.'
                    : 'Nenhum condutor corresponde ao filtro.'}
                </td>
              </tr>
            )}
            {condutores.map((c) => (
              <tr key={c.cpf} className="border-t border-gray-100 hover:bg-surface">
                <td className="px-4 py-2 font-medium">{c.nome}</td>
                <td className="px-4 py-2 font-mono text-xs">{formatarCPF(c.cpf)}</td>
                <td className="px-4 py-2">{c.matricula}</td>
                <td className="px-4 py-2">{c.cargo}</td>
                <td className="px-4 py-2">{c.unidade}</td>
                <td className="px-4 py-2">
                  {c.categoriaCNH && <span className="font-semibold">{c.categoriaCNH}</span>}
                  {c.numeroCNH && <span className="text-muted text-xs"> · {c.numeroCNH}</span>}
                </td>
                <td className="px-4 py-2">
                  <span className={badgeCNH(c.validadeCNH)}>{c.validadeCNH || '—'}</span>
                </td>
                <td className="px-4 py-2">
                  <StatusPill status={c.status} />
                </td>
                <td className="px-4 py-2 text-right whitespace-nowrap">
                  <button onClick={() => onVer(c)} className="text-brand-600 hover:underline text-xs mr-3">Ver</button>
                  <button onClick={() => onEditar(c)} className="text-brand-600 hover:underline text-xs mr-3">Editar</button>
                  <button onClick={() => onExcluir(c)} className="text-bad hover:underline text-xs">Excluir</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ============================================================
   NOVO CONDUTOR
============================================================ */
function NovoView({ onSalvo, notificar }) {
  const [form, setForm] = useState(() =>
    CAMPOS_FORM.reduce((acc, k) => ({ ...acc, [k]: '' }), {}),
  );
  const [salvando, setSalvando] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const salvar = async (e) => {
    e.preventDefault();
    const cpfNorm = normalizarCPF(form.cpf);
    if (cpfNorm.length !== 11) return notificar('CPF inválido (precisa 11 dígitos).', 'bad');
    if (!form.nome.trim()) return notificar('Nome é obrigatório.', 'bad');

    setSalvando(true);
    try {
      const ref = doc(db, COL, cpfNorm);
      const existe = await getDoc(ref);
      if (existe.exists()) {
        notificar('Já existe um condutor com este CPF.', 'warn');
      } else {
        await setDoc(ref, {
          ...form,
          cpf: cpfNorm,
          criadoEm: serverTimestamp(),
          atualizadoEm: serverTimestamp(),
          origem: 'manual',
        });
        notificar('Condutor cadastrado com sucesso!');
        onSalvo({ ...form, cpf: cpfNorm });
      }
    } catch (err) {
      console.error(err);
      notificar('Erro ao salvar: ' + err.message, 'bad');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <form onSubmit={salvar} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h2 className="text-lg font-semibold mb-1">Novo condutor</h2>
      <p className="text-sm text-muted mb-4">
        Cadastro manual. Para importar muitos de uma vez, use a aba "Importar planilha".
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {CAMPOS_FORM.map((k) => (
          <div key={k} className={k === 'observacaoCNH' ? 'md:col-span-2 lg:col-span-3' : ''}>
            <label className="block text-xs font-medium text-muted mb-1">{labelDe(k)}</label>
            <input
              value={form[k]}
              onChange={(e) => set(k, e.target.value)}
              placeholder={placeholderDe(k)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
            />
          </div>
        ))}
      </div>

      <AnexosCadastro collectionName={COL} recordId={form.cpf || form.matricula || form.nome} anexos={form.Anexos || []} onChange={(anexos) => setForm((current) => ({ ...current, Anexos: anexos }))} />

      <div className="mt-6 flex gap-3">
        <button
          type="submit"
          disabled={salvando}
          className="px-5 py-2 bg-brand-600 text-white rounded-md text-sm hover:bg-brand-700 disabled:opacity-50"
        >
          {salvando ? 'Salvando…' : 'Cadastrar'}
        </button>
      </div>
    </form>
  );
}

/* ============================================================
   IMPORTAR PLANILHA
============================================================ */
function ImportarView({ onConcluido, notificar }) {
  const inputRef = useRef(null);
  const [preview, setPreview] = useState(null);
  const [gravando, setGravando] = useState(false);

  const lerArquivo = (file) => {
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const wb = XLSX.read(evt.target.result, { type: 'array', cellDates: true });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

        const headerIdx = rows.findIndex(
          (r) => String(r[0]).trim().toLowerCase() === 'id',
        );
        if (headerIdx === -1) {
          notificar('Cabeçalho (id → Nome → Matrícula...) não encontrado.', 'bad');
          return;
        }

        const headers = rows[headerIdx].map((h) => String(h).trim());
        const dados = rows.slice(headerIdx + 1)
          .filter((r) => r.some((c) => String(c).trim() !== ''))
          .map((r) => {
            const obj = {};
            CAMPOS.forEach(({ key, col }) => {
              const idx = headers.indexOf(col);
              obj[key] = idx >= 0 ? limparValor(r[idx]) : '';
            });
            return obj;
          });

        const validos = [];
        const semCPF = [];
        const vistos = new Set();
        dados.forEach((d) => {
          const cpf = normalizarCPF(d.cpf);
          if (cpf.length !== 11) return semCPF.push(d);
          if (vistos.has(cpf)) return;
          vistos.add(cpf);
          validos.push({ ...d, cpf });
        });

        setPreview({ linhas: validos, ignoradasSemCPF: semCPF.length });
      } catch (e) {
        console.error(e);
        notificar('Erro ao ler planilha: ' + e.message, 'bad');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const gravar = async (sobrescrever = false) => {
    if (!preview) return;
    setGravando(true);
    try {
      const existentes = sobrescrever
        ? new Set()
        : new Set((await getDocs(collection(db, COL))).docs.map((item) => item.id));
      const vistos = new Set(existentes);
      let batch = writeBatch(db);
      let noLote = 0;
      let gravados = 0;

      for (const linha of preview.linhas) {
        const ref = doc(db, COL, linha.cpf);
        if (!sobrescrever && vistos.has(linha.cpf)) continue;
        const { cpf, ...resto } = linha;
        batch.set(
          ref,
          {
            ...resto,
            cpf,
            origem: 'planilha',
            atualizadoEm: serverTimestamp(),
            ...(sobrescrever ? {} : { criadoEm: serverTimestamp() }),
          },
          { merge: true },
        );
        vistos.add(linha.cpf);
        noLote += 1;
        gravados += 1;
        if (noLote === 450) {
          await batch.commit();
          batch = writeBatch(db);
          noLote = 0;
        }
      }

      if (gravados === 0) {
        notificar('Nada a gravar (todos já existem). Marque "sobrescrever".', 'warn');
        return;
      }
      if (noLote > 0) await batch.commit();
      notificar(`${gravados} condutor(es) importado(s).`);
      setPreview(null);
      onConcluido(preview.linhas);
    } catch (e) {
      console.error(e);
      notificar('Erro ao gravar: ' + e.message, 'bad');
    } finally {
      setGravando(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h2 className="text-lg font-semibold mb-1">Importar planilha</h2>
      <p className="text-sm text-muted mb-4">
        A planilha deve ter uma linha de cabeçalho começando por <strong>id</strong>.
        As colunas seguem o padrão do sistema (Nome, Matrícula, CPF, Cargo, etc).
      </p>

      <div className="flex flex-wrap gap-3 items-center">
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) lerArquivo(f);
          }}
          className="text-sm"
        />
        {preview && (
          <>
            <button
              onClick={() => gravar(false)}
              disabled={gravando}
              className="px-4 py-2 bg-brand-600 text-white rounded-md text-sm hover:bg-brand-700 disabled:opacity-50"
            >
              {gravando ? 'Gravando…' : 'Importar (sem sobrescrever)'}
            </button>
            <button
              onClick={() => gravar(true)}
              disabled={gravando}
              className="px-4 py-2 bg-warn text-white rounded-md text-sm hover:opacity-90 disabled:opacity-50"
            >
              Importar sobrescrevendo
            </button>
            <button
              onClick={() => { setPreview(null); if (inputRef.current) inputRef.current.value = ''; }}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm"
            >
              Cancelar
            </button>
          </>
        )}
      </div>

      {preview && (
        <div className="mt-6">
          <p className="text-sm text-muted mb-2">
            {preview.linhas.length} linha(s) válida(s)
            {preview.ignoradasSemCPF > 0 && ` · ${preview.ignoradasSemCPF} ignorada(s) por CPF inválido`}
          </p>
          <div className="overflow-auto max-h-[50vh] border border-gray-200 rounded-md">
            <table className="w-full text-xs">
              <thead className="bg-surface sticky top-0">
                <tr className="text-left text-muted uppercase">
                  <th className="px-3 py-2">Nome</th>
                  <th className="px-3 py-2">CPF</th>
                  <th className="px-3 py-2">Matrícula</th>
                  <th className="px-3 py-2">Cargo</th>
                  <th className="px-3 py-2">Unidade</th>
                  <th className="px-3 py-2">CNH</th>
                  <th className="px-3 py-2">Validade</th>
                  <th className="px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {preview.linhas.slice(0, 100).map((l, i) => (
                  <tr key={l.cpf + i} className="border-t border-gray-100">
                    <td className="px-3 py-1.5">{l.nome}</td>
                    <td className="px-3 py-1.5 font-mono">{formatarCPF(l.cpf)}</td>
                    <td className="px-3 py-1.5">{l.matricula}</td>
                    <td className="px-3 py-1.5">{l.cargo}</td>
                    <td className="px-3 py-1.5">{l.unidade}</td>
                    <td className="px-3 py-1.5">
                      {l.categoriaCNH}{l.numeroCNH ? ` · ${l.numeroCNH}` : ''}
                    </td>
                    <td className="px-3 py-1.5">{l.validadeCNH}</td>
                    <td className="px-3 py-1.5">{l.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {preview.linhas.length > 100 && (
            <p className="text-xs text-muted mt-2">
              Exibindo as primeiras 100 linhas de {preview.linhas.length}.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/* ============================================================
   DRAWER (visualizar / editar)
============================================================ */
function Drawer({ modo, dados, onFechar, onSalvo, notificar }) {
  const editando = modo === 'edit';
  const [form, setForm] = useState(() =>
    CAMPOS_FORM.reduce((acc, k) => ({ ...acc, [k]: dados[k] ?? '' }), {}),
  );
  const [salvando, setSalvando] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const salvar = async () => {
    const cpfNorm = normalizarCPF(form.cpf || dados.cpf);
    if (cpfNorm.length !== 11) return notificar('CPF inválido.', 'bad');
    if (!form.nome.trim()) return notificar('Nome é obrigatório.', 'bad');

    setSalvando(true);
    try {
      await setDoc(
        doc(db, COL, cpfNorm),
        { ...form, cpf: cpfNorm, atualizadoEm: serverTimestamp() },
        { merge: true },
      );
      onSalvo({ ...form, cpf: cpfNorm });
    } catch (e) {
      console.error(e);
      notificar('Erro ao salvar: ' + e.message, 'bad');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex">
      <div className="flex-1 bg-black/40" onClick={onFechar} />
      <aside className="w-full max-w-xl bg-white h-full shadow-2xl flex flex-col">
        <header className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">
              {editando ? 'Editar condutor' : 'Detalhes do condutor'}
            </h3>
            <p className="text-xs text-muted font-mono">{formatarCPF(dados.cpf)}</p>
          </div>
          <button onClick={onFechar} className="text-muted hover:text-ink text-2xl leading-none">×</button>
        </header>

        <div className="flex-1 overflow-auto p-6">
          {GRUPOS_CAMPOS.map((grupo) => (
            <section key={grupo.titulo} className="mb-6">
              <h4 className="text-xs font-semibold text-muted uppercase mb-3">
                {grupo.titulo}
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {grupo.campos.map((k) => (
                  <div key={k} className={k === 'observacaoCNH' ? 'md:col-span-2' : ''}>
                    <label className="block text-xs font-medium text-muted mb-1">
                      {labelDe(k)}
                    </label>
                    {editando ? (
                      <input
                        value={form[k] ?? ''}
                        onChange={(e) => set(k, e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
                      />
                    ) : (
                      <div className="text-sm px-3 py-2 bg-surface rounded-md min-h-[38px]">
                        {String(dados[k] ?? '') || <span className="text-muted">—</span>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          ))}
          {editando && <AnexosCadastro collectionName={COL} recordId={form.cpf || dados.cpf || form.matricula || form.nome} anexos={form.Anexos || dados.Anexos || []} onChange={(anexos) => setForm((current) => ({ ...current, Anexos: anexos }))} />}
        </div>

        <footer className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={onFechar}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm"
          >
            Fechar
          </button>
          {editando && (
            <button
              onClick={salvar}
              disabled={salvando}
              className="px-4 py-2 bg-brand-600 text-white rounded-md text-sm hover:bg-brand-700 disabled:opacity-50"
            >
              {salvando ? 'Salvando…' : 'Salvar alterações'}
            </button>
          )}
        </footer>
      </aside>
    </div>
  );
}