import { useEffect, useRef, useState } from "react";
import { collection, deleteDoc, doc, documentId, getCountFromServer, getDocs, limit, orderBy, query, setDoc, startAfter, where, writeBatch } from "firebase/firestore";
import { db } from "./firebase";
import * as XLSX from "xlsx";
import AnexosCadastro from "./AnexosCadastro";

/**
 * Lista COMPLETA de campos do cadastro de Funcionários
 * (conforme cabeçalho informado)
 */
const CAMPOS_FUNCIONARIO = [
  "Status",
  "Matricula",
  "Nome",
  "Data Admissao",
  "Sit. Folha",
  "Dt. Demissao",
  "Cod. Funcao",
  "Funcao Descricao",
  "C Custo",
  "C Custo Descricao",
  "Diretoria",
  "CPF",
  "P.I.S.",
  "Data Nascimento",
  "Municipio de Trabalho",
  "Cod. Depto.",
  "Nome Departamento",
  "Gestor Matricula",
  "Gestor",
  "Recursos Humanos",
  "CBO 2002",
  "R.G.",
  "Org Emis RG",
  "UF do RG",
  "Dt. Emis. RG",
  "Numero CTPS",
  "Serie CTPS",
  "UF CTPS",
  "Sexo",
  "Raca/Cor",
  "Estado Civil",
  "Codigo Instr RAIS",
  "Grau de Instrucao",
  "Nome Pai",
  "Nome Mae",
  "Municp.Nascimento",
  "Naturalidade UF",
  "Bco.Ag.Deposito Salario",
  "Cta.Dep.Sal.",
  "Tipo Cta Sal",
  "Tipo Logradouro",
  "Endereco",
  "Numero",
  "Complemento",
  "Bairro",
  "Municipio",
  "Estado",
  "Cep",
  "DDD Celular",
  "Numero Celular",
  "DDD Telefone",
  "Telefone",
  "Email",
  "Tipo de Cont.Trab",
  "Vencimento 1 Periodo Contrato",
  "Vencimento 2 Periodo Contrato",
  "Turno Trabalho",
  "Turno de Trabalho Nome",
  "Regra Apont.",
  "Hrs. Mensais",
  "Hrs.Semanais",
  "Horas por Dia",
  "Deficiente?",
  "Tp.Deficien",
  "Cota Def",
  "Obs.Deficien",
  "Tipo Resc.",
  "Nome", // (campo duplicado no cabeçalho — mantido como está na origem)
  "Posto de Trabalho",
  "Emissor CNH",
  "Data Emissao CNH",
  "UF CNH",
  "Primeira Habilitacao CNH",
  "Categoria CNH",
  "Data de Validade CNH",
  "Numero Cart.Habil.",
  "Cod Municip",
  "Nome Muni",
  "Dt Term Cont",
  "Cat. Func.",
  "Cat. eSocial",
  "Cod.Unico",
];

/**
 * Trata o cabeçalho duplicado "Nome" (aparece 2x no arquivo original).
 * Na importação, o segundo "Nome" é remapeado para "Nome_2",
 * que NÃO existe nos CAMPOS_FUNCIONARIO (ignorado). Se você souber
 * o nome correto desse campo (ex.: "Nome Social"), troque aqui.
 */
const ALIAS_IMPORTACAO = {
  // cabeçalho na planilha -> nome interno
  // (ajuste conforme sua regra de negócio)
};

const vazio = () =>
  CAMPOS_FUNCIONARIO.reduce((acc, c) => ({ ...acc, [c]: "" }), {});

export default function Funcionarios() {
  const [form, setForm] = useState(vazio());
  const [funcionarios, setFuncionarios] = useState([]);
  const [editando, setEditando] = useState(null);
  const [aba, setAba] = useState("lista");
  const [busca, setBusca] = useState("");
  const [buscaAplicada, setBuscaAplicada] = useState("");
  const [erroImport, setErroImport] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erroCarga, setErroCarga] = useState("");
  const [total, setTotal] = useState(null);
  const [pagina, setPagina] = useState(0);
  const [cursores, setCursores] = useState([null]);
  const [ultimoDoc, setUltimoDoc] = useState(null);
  const [temProxima, setTemProxima] = useState(false);
  const fileRef = useRef(null);
  const TAMANHO_PAGINA = 50;

  async function carregarPagina(cursor = null, termo = buscaAplicada) {
    setCarregando(true);
    setErroCarga("");
    try {
      const ref = collection(db, "funcionarios");
      let consulta;
      const q = termo.trim();
      if (q) {
        const apenasNumeros = /^\d+$/.test(q);
        const campo = apenasNumeros ? (q.length >= 8 ? "CPF" : "Matricula") : "Nome";
        consulta = query(
          ref,
          orderBy(campo),
          where(campo, ">=", q),
          where(campo, "<=", q + "\uf8ff"),
          limit(TAMANHO_PAGINA + 1)
        );
      } else {
        consulta = query(
          ref,
          orderBy(documentId()),
          ...(cursor ? [startAfter(cursor)] : []),
          limit(TAMANHO_PAGINA + 1)
        );
      }
      const snap = await getDocs(consulta);
      const docsVisiveis = snap.docs.slice(0, TAMANHO_PAGINA);
      setFuncionarios(docsVisiveis.map((item) => ({ __docId: item.id, ...item.data() })));
      setUltimoDoc(docsVisiveis.length ? docsVisiveis[docsVisiveis.length - 1] : null);
      setTemProxima(snap.docs.length > TAMANHO_PAGINA);
      if (!q && total === null) {
        try {
          const contagem = await getCountFromServer(ref);
          setTotal(contagem.data().count);
        } catch {
          setTotal(null);
        }
      }
    } catch (error) {
      console.error("Erro ao carregar funcionários:", error);
      setErroCarga("Não foi possível carregar os funcionários. Confira a conexão e tente novamente.");
      setFuncionarios([]);
      setUltimoDoc(null);
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    void carregarPagina(null, "");
    // A primeira consulta é intencionalmente executada uma única vez.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function pesquisar() {
    const termo = busca.trim();
    setBuscaAplicada(termo);
    setPagina(0);
    setCursores([null]);
    void carregarPagina(null, termo);
  }

  function proximaPagina() {
    if (!ultimoDoc || carregando || buscaAplicada.trim() || !temProxima) return;
    const novosCursores = [...cursores.slice(0, pagina + 1), ultimoDoc];
    setCursores(novosCursores);
    setPagina(pagina + 1);
    void carregarPagina(ultimoDoc, "");
  }

  function paginaAnterior() {
    if (pagina <= 0 || carregando) return;
    const novaPagina = pagina - 1;
    setPagina(novaPagina);
    void carregarPagina(cursores[novaPagina] || null, "");
  }

  function onChange(campo, valor) {
    setForm((f) => ({ ...f, [campo]: valor }));
  }

  async function salvar(e) {
    e.preventDefault();
    if (!form["Matricula"] && !form["CPF"] && !form["Nome"]) {
      alert("Informe ao menos Matrícula, CPF ou Nome.");
      return;
    }
    setCarregando(true);
    try {
      const ref = collection(db, "funcionarios");
      if (!editando) {
        const verificacoes = [];
        if (String(form["Matricula"] || "").trim()) {
          verificacoes.push(getDocs(query(ref, where("Matricula", "==", String(form["Matricula"]).trim()), limit(1))));
        }
        if (String(form["CPF"] || "").trim()) {
          verificacoes.push(getDocs(query(ref, where("CPF", "==", String(form["CPF"]).trim()), limit(1))));
        }
        const encontrados = await Promise.all(verificacoes);
        if (encontrados.some((snap) => !snap.empty)) {
          alert("Já existe um funcionário com essa matrícula ou CPF. Pesquise o cadastro antes de criar outro.");
          return;
        }
        await setDoc(doc(ref), form);
      } else {
        const dados = { ...form };
        delete dados.__docId;
        await setDoc(doc(db, "funcionarios", editando.__docId), dados, { merge: true });
      }
      setForm(vazio());
      setEditando(null);
      setAba("lista");
      setPagina(0);
      setCursores([null]);
      await carregarPagina(null, buscaAplicada);
    } catch (error) {
      console.error("Erro ao salvar funcionário:", error);
      alert("Não foi possível salvar o funcionário. Tente novamente.");
    } finally {
      setCarregando(false);
    }
  }

  function editar(funcionario) {
    setForm({ ...vazio(), ...funcionario });
    setEditando(funcionario);
    setAba("form");
  }

  async function excluir(funcionario) {
    if (!confirm("Excluir este funcionário? Esta ação não pode ser desfeita.")) return;
    try {
      await deleteDoc(doc(db, "funcionarios", funcionario.__docId));
      await carregarPagina(null, busca);
      setPagina(0);
      setCursores([null]);
    } catch (error) {
      console.error("Erro ao excluir funcionário:", error);
      alert("Não foi possível excluir o funcionário.");
    }
  }

  function novo() {
    setForm(vazio());
    setEditando(null);
    setAba("form");
  }

  function baixarModelo() {
    const ws = XLSX.utils.json_to_sheet([vazio()], { header: CAMPOS_FUNCIONARIO });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Funcionarios");
    XLSX.writeFile(wb, "modelo_funcionarios.xlsx");
  }

  async function importarArquivo(file) {
    setErroImport("");
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array", cellDates: true });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const dados = XLSX.utils.sheet_to_json(ws, { defval: "", raw: false });
      if (!dados.length) {
        setErroImport("Planilha vazia.");
        return;
      }
      const normaliza = (s) => String(s).trim().replace(/\s+/g, " ");
      const mapaCabecalho = new Map();
      CAMPOS_FUNCIONARIO.forEach((c) => mapaCabecalho.set(normaliza(c).toLowerCase(), c));
      Object.entries(ALIAS_IMPORTACAO).forEach(([origem, destino]) => mapaCabecalho.set(normaliza(origem).toLowerCase(), destino));

      const candidatos = dados.map((linha) => {
        const obj = vazio();
        Object.entries(linha).forEach(([k, v]) => {
          const campo = mapaCabecalho.get(normaliza(k).toLowerCase());
          if (campo && campo in obj) obj[campo] = v == null ? "" : String(v);
        });
        return obj;
      });
      setCarregando(true);
      // A leitura integral só ocorre quando o usuário escolhe importar, para
      // validar duplicidades sem sobrescrever os 7.628 cadastros existentes.
      const existentesSnap = await getDocs(collection(db, "funcionarios"));
      const chavesDe = (row) => {
        const matricula = String(row["Matricula"] || "").trim().toLowerCase();
        const cpf = String(row["CPF"] || "").replace(/\D/g, "");
        return [matricula ? "m:" + matricula : "", cpf ? "c:" + cpf : ""].filter(Boolean);
      };
      const existentes = new Set(existentesSnap.docs.flatMap((item) => chavesDe(item.data())));
      const importados = [];
      let duplicados = 0;
      let semIdentificador = 0;
      candidatos.forEach((row) => {
        const chaves = chavesDe(row);
        if (!chaves.length) { semIdentificador++; return; }
        if (chaves.some((chave) => existentes.has(chave))) { duplicados++; return; }
        importados.push(row);
        chaves.forEach((chave) => existentes.add(chave));
      });
      for (let i = 0; i < importados.length; i += 400) {
        const lote = writeBatch(db);
        importados.slice(i, i + 400).forEach((row) => lote.set(doc(collection(db, "funcionarios")), row));
        await lote.commit();
      }
      setErroImport(`Importação analisada: ${importados.length} funcionário(s) novo(s), ${duplicados} duplicado(s) ignorado(s) e ${semIdentificador} linha(s) sem matrícula/CPF ignorada(s). Nenhum cadastro existente foi sobrescrito.`);
      setAba("importar");
      setPagina(0);
      setCursores([null]);
      await carregarPagina(null, "");
    } catch (error) {
      console.error(error);
      setErroImport("Falha ao ler/importar arquivo. Use .xlsx, .xls ou .csv e confira sua conexão com o Firebase.");
    } finally {
      setCarregando(false);
    }
  }

  const totalPaginas = total == null ? null : Math.max(1, Math.ceil(total / TAMANHO_PAGINA));

  return (
    <div className="font-sans">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="text-xl font-semibold">Funcionários</h1>
          <p className="text-sm text-muted mt-1">
            {total == null ? "Carregamento sob demanda" : `${total.toLocaleString("pt-BR")} funcionários cadastrados`} · exibindo até {TAMANHO_PAGINA} por página
          </p>
        </div>
        <nav className="flex flex-wrap gap-2">
          <button onClick={() => setAba("lista")} className={`px-3 py-1.5 rounded-md text-sm border ${aba === "lista" ? "bg-brand-600 text-white border-brand-600" : "bg-white hover:bg-surface"}`}>Lista</button>
          <button onClick={novo} className="px-3 py-1.5 rounded-md text-sm bg-brand-600 text-white">Novo Funcionário</button>
          <button onClick={() => setAba("importar")} className={`px-3 py-1.5 rounded-md text-sm border ${aba === "importar" ? "bg-brand-600 text-white border-brand-600" : "bg-white hover:bg-surface"}`}>Importar Planilha</button>
        </nav>
      </div>

      {aba === "lista" && (
        <section>
          <div className="flex flex-col sm:flex-row gap-2 mb-4">
            <input
              placeholder="Pesquisar por nome, matrícula ou CPF (início do texto)"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="flex-1 px-3 py-2 border rounded-md text-sm"
            />
            <button onClick={pesquisar} className="px-3 py-2 text-sm bg-brand-600 text-white rounded-md">Pesquisar</button>
            <button onClick={baixarModelo} className="px-3 py-2 text-sm border rounded-md bg-white hover:bg-surface">Baixar modelo</button>
            <button onClick={() => { setBusca(""); setBuscaAplicada(""); setPagina(0); setCursores([null]); void carregarPagina(null, ""); }} className="px-3 py-2 text-sm border rounded-md bg-white hover:bg-surface">Limpar busca</button>
          </div>

          {erroCarga && <p className="text-sm text-red-600 mb-3">{erroCarga}</p>}
          {carregando && <p className="text-sm text-muted mb-3">Carregando funcionários...</p>}
          {!carregando && !erroCarga && funcionarios.length === 0 && (
            <div className="border rounded-xl p-8 text-center text-muted">Nenhum funcionário encontrado para essa pesquisa.</div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {funcionarios.map((f) => (
              <article key={f.__docId} className="border rounded-xl p-4 bg-white shadow-sm">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-sm break-words">{f["Nome"] || "Nome não informado"}</h3>
                    <p className="text-xs text-muted mt-1">Matrícula: {f["Matricula"] || "—"}</p>
                  </div>
                  <span className="text-xs rounded-full px-2 py-1 bg-surface border shrink-0">{f["Status"] || "Sem status"}</span>
                </div>
                <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                  <div><dt className="text-muted">Função</dt><dd className="font-medium break-words">{f["Funcao Descricao"] || "—"}</dd></div>
                  <div><dt className="text-muted">Departamento</dt><dd className="font-medium break-words">{f["Nome Departamento"] || "—"}</dd></div>
                  <div><dt className="text-muted">Gestor</dt><dd className="font-medium break-words">{f["Gestor"] || "—"}</dd></div>
                  <div><dt className="text-muted">CPF</dt><dd className="font-medium">{f["CPF"] || "—"}</dd></div>
                  <div><dt className="text-muted">Admissão</dt><dd className="font-medium">{f["Data Admissao"] || "—"}</dd></div>
                  <div><dt className="text-muted">Município</dt><dd className="font-medium break-words">{f["Municipio de Trabalho"] || "—"}</dd></div>
                </dl>
                <div className="flex gap-3 border-t mt-4 pt-3 text-sm">
                  <button onClick={() => editar(f)} className="text-brand-700 hover:underline">Editar</button>
                  <button onClick={() => excluir(f)} className="text-red-600 hover:underline">Excluir</button>
                </div>
              </article>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 mt-5">
            <p className="text-xs text-muted">
              {buscaAplicada.trim()
                ? `Resultados desta pesquisa: ${funcionarios.length} (limite de ${TAMANHO_PAGINA})`
                : `Página ${pagina + 1}${totalPaginas ? ` de ${totalPaginas}` : ""} · ${funcionarios.length} funcionário(s) carregado(s)`}
            </p>
            {!buscaAplicada.trim() && (
              <div className="flex gap-2">
                <button disabled={pagina === 0 || carregando} onClick={paginaAnterior} className="px-3 py-2 text-sm border rounded-md disabled:opacity-40">Anterior</button>
                <button disabled={!ultimoDoc || !temProxima || carregando} onClick={proximaPagina} className="px-3 py-2 text-sm border rounded-md disabled:opacity-40">Próxima</button>
              </div>
            )}
          </div>
        </section>
      )}

      {aba === "form" && (
        <form onSubmit={salvar}>
          <h2 className="text-lg font-semibold mb-3">{editando ? "Editar funcionário" : "Novo funcionário"}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {CAMPOS_FUNCIONARIO.map((campo, indice) => (
              <label key={`${campo}-${indice}`} className="flex flex-col text-sm">
                <span className="text-xs text-muted mb-1">{campo}</span>
                <input value={form[campo] ?? ""} onChange={(e) => onChange(campo, e.target.value)} className="px-2 py-1.5 border rounded-md" />
              </label>
            ))}
          </div>
          <AnexosCadastro collectionName="funcionarios" recordId={form.__docId || form["Matricula"] || form["CPF"] || form["Nome"]} anexos={form.Anexos || []} onChange={(anexos) => onChange("Anexos", anexos)} />
          <div className="mt-4 flex gap-2">
            <button type="submit" disabled={carregando} className="px-3 py-1.5 rounded-md text-sm bg-brand-600 text-white disabled:opacity-50">Salvar</button>
            <button type="button" onClick={() => { setAba("lista"); setEditando(null); }} className="px-3 py-1.5 rounded-md text-sm border bg-white hover:bg-surface">Cancelar</button>
          </div>
        </form>
      )}

      {aba === "importar" && (
        <section>
          <h2 className="text-lg font-semibold mb-2">Importar planilha de funcionários</h2>
          <p className="text-sm text-muted mb-3">Formatos aceitos: <b>.xlsx</b>, <b>.xls</b>, <b>.csv</b>. A primeira linha deve conter os cabeçalhos iguais aos campos abaixo (não precisa ter todos).</p>
          <div className="flex flex-wrap gap-2 mb-3">
            <button onClick={baixarModelo} className="px-3 py-2 text-sm border rounded-md bg-white hover:bg-surface">Baixar modelo (.xlsx)</button>
            <button onClick={() => fileRef.current?.click()} className="px-3 py-2 text-sm bg-brand-600 text-white rounded-md">Selecionar arquivo</button>
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void importarArquivo(f); e.target.value = ""; }} />
          </div>
          {carregando && <p className="text-sm text-muted mb-2">Processando...</p>}
          {erroImport && <p className="text-sm text-brand-700">{erroImport}</p>}
          <details className="text-sm mt-3">
            <summary className="cursor-pointer">Campos esperados ({CAMPOS_FUNCIONARIO.length})</summary>
            <ul className="columns-2 md:columns-3 gap-6 text-xs mt-2 max-h-60 overflow-auto">{CAMPOS_FUNCIONARIO.map((c, i) => <li key={`${c}-${i}`}>{c}</li>)}</ul>
          </details>
        </section>
      )}
    </div>
  );
}
