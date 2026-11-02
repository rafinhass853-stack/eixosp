import { useEffect, useMemo, useState } from 'react';
import { collection, doc, getDocs, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import AnexosCadastro from './AnexosCadastro';

const LOCADORAS = ['Movida', 'CCV', 'Naubrás', 'Emtel', 'Dinâmica'];
const COL = 'locadoras';
const CACHE_TTL_MS = 5 * 60 * 1000;
let locadorasCache = { rows: null, updatedAt: 0 };

function exibir(valor) {
  if (valor == null) return '';
  if (typeof valor?.toDate === 'function') return valor.toDate().toLocaleDateString('pt-BR');
  if (valor instanceof Date) return valor.toLocaleDateString('pt-BR');
  if (typeof valor === 'object') return JSON.stringify(valor);
  return String(valor);
}

function dadosDaLinha(item) {
  return { ...(item.dadosPlanilha || {}), ...item };
}

export default function Locadoras() {
  const [locadora, setLocadora] = useState('Movida');
  const [linhas, setLinhas] = useState([]);
  const [busca, setBusca] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  useEffect(() => {
    const selecionar = (event) => {
      if (LOCADORAS.includes(event.detail)) setLocadora(event.detail);
    };
    window.addEventListener('locadora-select', selecionar);
    return () => window.removeEventListener('locadora-select', selecionar);
  }, []);

  useEffect(() => {
    let ativo = true;
    if (locadorasCache.rows && Date.now() - locadorasCache.updatedAt < CACHE_TTL_MS) {
      setLinhas(locadorasCache.rows);
      setCarregando(false);
      return () => { ativo = false; };
    }
    (async () => {
      try {
        const snapshot = await getDocs(collection(db, COL));
        const rows = snapshot.docs.map((doc) => ({ __docId: doc.id, ...doc.data() }));
        locadorasCache = { rows, updatedAt: Date.now() };
        if (ativo) setLinhas(rows);
      } catch (error) {
        console.error('Erro ao carregar locadoras:', error);
        if (ativo) setErro('Não foi possível carregar os dados das locadoras.');
      } finally {
        if (ativo) setCarregando(false);
      }
    })();
    return () => { ativo = false; };
  }, []);

  const daLocadora = useMemo(() => linhas
    .filter((item) => item.locadora === locadora)
    .map(dadosDaLinha), [linhas, locadora]);

  const colunas = useMemo(() => {
    const usadas = new Set();
    daLocadora.forEach((linha) => Object.keys(linha).forEach((chave) => {
      if (!['__docId', 'dadosPlanilha', 'locadora'].includes(chave)) usadas.add(chave);
    }));
    return Array.from(usadas);
  }, [daLocadora]);

  const filtradas = useMemo(() => {
    const termo = busca.trim().toLocaleLowerCase('pt-BR');
    if (!termo) return daLocadora;
    return daLocadora.filter((linha) => colunas.some((coluna) => exibir(linha[coluna]).toLocaleLowerCase('pt-BR').includes(termo)));
  }, [busca, colunas, daLocadora]);

  return (
    <section className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="p-5 border-b border-gray-100">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-brand-600 font-semibold">Gestão de terceiros</p>
            <h2 className="text-2xl font-semibold text-ink mt-1">Locadoras</h2>
            <p className="text-sm text-muted mt-1">Veículos, contratos e valores organizados por locadora.</p>
          </div>
          <div className="text-right text-sm text-muted">
            <strong className="text-2xl text-brand-700 block">{filtradas.length}</strong>
            registros em {locadora}
          </div>
        </div>
        <div className="flex flex-wrap gap-2 mt-5" role="tablist" aria-label="Locadoras">
          {LOCADORAS.map((nome) => (
            <button
              key={nome}
              type="button"
              role="tab"
              aria-selected={locadora === nome}
              onClick={() => setLocadora(nome)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition ${locadora === nome ? 'bg-brand-600 text-white shadow-sm' : 'bg-surface text-muted hover:bg-brand-50 hover:text-brand-700'}`}
            >
              {nome}
              <span className="ml-2 opacity-70">{linhas.filter((item) => item.locadora === nome).length}</span>
            </button>
          ))}
        </div>
        <input
          value={busca}
          onChange={(event) => setBusca(event.target.value)}
          placeholder="Buscar por placa, contrato, modelo..."
          className="mt-4 w-full max-w-xl px-4 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
        />
      </div>
      {erro && <div className="p-6 text-bad text-sm">{erro}</div>}
      {carregando && <div className="p-8 text-center text-muted">Carregando dados das locadoras…</div>}
      {!carregando && !erro && filtradas.length === 0 && <div className="p-8 text-center text-muted">Nenhum registro encontrado para esta locadora.</div>}
      {!carregando && !erro && filtradas.length > 0 && (
        <div className="overflow-auto max-h-[66vh]">
          <table className="w-full text-sm min-w-[760px]">
            <thead className="bg-surface sticky top-0 z-10">
              <tr className="text-left text-muted uppercase text-xs">
                {colunas.map((coluna) => <th key={coluna} className="px-4 py-3 whitespace-nowrap">{coluna}</th>)}
                <th className="px-4 py-3 whitespace-nowrap">Fotos e arquivos</th>
              </tr>
            </thead>
            <tbody>
              {filtradas.map((linha) => (
                <tr key={linha.__docId || `${linha.placa}-${linha.id}`} className="border-t border-gray-100 hover:bg-surface align-top">
                  {colunas.map((coluna) => <td key={coluna} className="px-4 py-2 whitespace-nowrap">{exibir(linha[coluna]) || '—'}</td>)}
                  <td className="px-4 py-2 min-w-[220px]"><details><summary className="cursor-pointer text-brand-700">{(linha.Anexos || []).length} anexo(s) · Gerenciar</summary><div className="mt-2 min-w-[280px]"><AnexosCadastro collectionName={COL} recordId={linha.__docId || linha.id || linha.placa} anexos={linha.Anexos || []} onChange={async (anexos) => { const id = linha.__docId; if (!id) throw new Error('Registro sem identificador no Firestore.'); await setDoc(doc(db, COL, id), { Anexos: anexos }, { merge: true }); setLinhas((current) => {
                    const rows = current.map((item) => item.__docId === id ? { ...item, Anexos: anexos } : item);
                    locadorasCache = { rows, updatedAt: Date.now() };
                    return rows;
                  }); }} /></div></details></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
