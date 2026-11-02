import { useEffect, useMemo, useRef, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "./firebase";
import { getDownloadURL, getStorage, ref, uploadBytes } from "firebase/storage";
import { useFirestoreCollection } from "./firestoreSync";
import * as XLSX from "xlsx";

const ETAPAS = [
  "Infração cadastrada",
  "Identificar condutor (Cobli)",
  "Aguardando retorno do gestor",
  "Termo enviado para assinatura",
  "Termo assinado recebido",
  "Indicação do condutor realizada",
  "Indicação validada",
  "Enviado ao RH",
];

const GRUPOS = [
  { titulo: "Dados principais da infração", ajuda: "Informações da notificação e do auto de infração.", campos: [
    ["AIT", "text", true], ["ID interno", "text"], ["Órgão autuador", "text"], ["Código da infração", "text"],
    ["Descrição da infração", "text"], ["Natureza da infração", "select", false, ["Leve", "Média", "Grave", "Gravíssima", "A confirmar"]],
    ["Valor da multa (R$)", "number"], ["Pontos na CNH", "number"], ["Data e hora da infração", "datetime-local"],
    ["Data de recebimento da notificação", "date"], ["Data de recebimento do e-mail", "datetime-local"],
    ["Prazo legal para indicação", "date"], ["Local da infração", "text"], ["Município", "text"], ["UF", "text"],
    ["Número do processo / protocolo", "text"], ["Origem da notificação", "select", false, ["E-mail", "Portal", "Locadora", "Outro"]],
  ]},
  { titulo: "Veículo e operação", ajuda: "Identifique o veículo e o contexto operacional.", campos: [
    ["Placa", "vehicle-select", true], ["Número da frota", "text"], ["Modelo do veículo", "text"], ["Propriedade / locadora", "text"],
    ["Unidade / base operacional", "text"], ["Tipo de operação", "text"], ["Observações da operação", "textarea"],
  ]},
  { titulo: "Identificação do condutor", ajuda: "A identificação no Cobli continua manual. Registre aqui o resultado da conferência.", campos: [
    ["Condutor identificado", "driver-select", true], ["Matrícula do condutor", "text"], ["CPF do condutor", "text"], ["Data da identificação", "date"],
    ["Responsável pela conferência", "text"], ["Evidência / observação Cobli", "textarea"],
    ["Gestor responsável", "text"], ["Data de envio ao gestor", "datetime-local"], ["Data de retorno do gestor", "datetime-local"],
    ["Decisão do gestor", "select", false, ["Aguardando", "Confirmou condutor", "Contestou identificação", "Sem retorno", "Não se aplica"]],
    ["Observação do gestor", "textarea"],
  ]},
  { titulo: "Termo e indicação", ajuda: "Controle as datas do termo, assinatura e indicação.", campos: [
    ["Data de envio do termo", "datetime-local"], ["Data de recebimento do termo assinado", "datetime-local"],
    ["Assinatura conferida por", "text"], ["Data da indicação do condutor", "date"],
    ["Protocolo da indicação", "text"], ["Data de validação da indicação", "date"],
    ["Resultado da validação", "select", false, ["Pendente", "Validada", "Rejeitada", "Não se aplica"]],
    ["Observações da indicação", "textarea"],
  ]},
  { titulo: "Encaminhamento ao RH — etapa final", ajuda: "O acompanhamento do PPCM termina quando o processo é enviado ao RH.", campos: [
    ["Data de envio ao RH", "datetime-local"], ["Destinatário / área do RH", "text"],
    ["Protocolo ou confirmação do RH", "text"], ["Encaminhamento / consequência", "textarea"],
    ["Observações finais", "textarea"],
  ]},
];

const CAMPOS = ["Etapa atual", ...GRUPOS.flatMap((g) => g.campos.map((c) => c[0])), "Data de criação", "Última atualização", "Anexos", "Histórico de etapas"];
const vazio = () => CAMPOS.reduce((acc, c) => ({ ...acc, [c]: c === "Etapa atual" ? ETAPAS[0] : "" }), { Anexos: [], "Histórico de etapas": [] });
const fmt = (value) => {
  if (!value) return "Não informado";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleDateString("pt-BR");
};
const normKey = (s) => String(s ?? "").normalize("NFD").replace(/[\\u0300-\\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
const fieldValue = (row, names) => {
  const entries = Object.entries(row || {});
  for (const name of names) {
    const found = entries.find(([key, value]) => normKey(key) === normKey(name) && value != null && String(value).trim() !== "");
    if (found) return String(found[1]).trim();
  }
  return "";
};
const slug = (s) => String(s || "arquivo").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 90);

export default function Multas() {
  const [registros, setRegistros, removeRegistro] = useFirestoreCollection("multas", (r) => r["AIT"] || r["ID interno"] || r.id);\n  const [condutores] = useFirestoreCollection("condutores", (r) => r.cpf || r.matricula || r.nome);\n  const [veiculos] = useFirestoreCollection("veiculos", (r) => r.Placa || r.id);
  const [form, setForm] = useState(vazio());
  const [editIndex, setEditIndex] = useState(null);
  const [aba, setAba] = useState("lista");
  const [busca, setBusca] = useState("");
  const [filtroEtapa, setFiltroEtapa] = useState("Todas");
  const [erro, setErro] = useState("");
  const [arquivos, setArquivos] = useState([]);
  const [condutoresSistema, setCondutoresSistema] = useState([]);
  const [veiculosSistema, setVeiculosSistema] = useState([]);
  const [cadastrosLoading, setCadastrosLoading] = useState(true);
  const [cadastrosErro, setCadastrosErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    let ativo = true;
    Promise.all([getDocs(collection(db, "condutores")), getDocs(collection(db, "veiculos"))])
      .then(([condSnap, veicSnap]) => {
        if (!ativo) return;
        setCondutoresSistema(condSnap.docs.map((d) => ({ __id: d.id, ...d.data() }))
          .map((r) => ({ ...r, __nome: fieldValue(r, ["nome", "Nome", "Condutor"]), __matricula: fieldValue(r, ["matricula", "Matrícula", "Matricula"]) }))
          .filter((r) => r.__nome));
        setVeiculosSistema(veicSnap.docs.map((d) => ({ __id: d.id, ...d.data() }))
          .map((r) => ({ ...r, __placa: fieldValue(r, ["Placa", "placa"]), __frota: fieldValue(r, ["Nº Frota", "Numero da frota", "Número da frota", "Frota"]), __modelo: fieldValue(r, ["Modelo Completo", "Modelo", "Modelo do veículo"]), __propriedade: fieldValue(r, ["Propriedade", "Propriedade / locadora"]) }))
          .filter((r) => r.__placa));
      })
      .catch((err) => {
        console.error("Falha ao carregar cadastros para multas", err);
        if (ativo) setCadastrosErro("Não foi possível consultar os cadastros de condutores e veículos. Confira as permissões do Firestore.");
      })
      .finally(() => { if (ativo) setCadastrosLoading(false); });
    return () => { ativo = false; };
  }, []);

  const abertas = registros.filter((r) => r["Etapa atual"] !== "Enviado ao RH");
  const enviadasRh = registros.filter((r) => r["Etapa atual"] === "Enviado ao RH");
  const vencidas = abertas.filter((r) => r["Prazo legal para indicação"] && new Date(r["Prazo legal para indicação"] + "T23:59:59") < new Date());
  const lista = useMemo(() => registros.filter((r) => {
    const q = busca.trim().toLocaleLowerCase("pt-BR");
    const matches = !q || ["AIT", "ID interno", "Placa", "Descrição da infração", "Condutor identificado", "Gestor responsável", "Etapa atual"].some((k) => String(r[k] || "").toLocaleLowerCase("pt-BR").includes(q));
    return matches && (filtroEtapa === "Todas" || (filtroEtapa === "Em acompanhamento" ? r["Etapa atual"] !== "Enviado ao RH" : r["Etapa atual"] === filtroEtapa));
  }), [registros, busca, filtroEtapa]);

  function novo() {
    setForm(vazio()); setEditIndex(null); setArquivos([]); setErro(""); setAba("form");
  }
  function editar(index) {
    setForm({ ...vazio(), ...registros[index] }); setEditIndex(index); setArquivos([]); setErro(""); setAba("form");
  }
  function onChange(campo, valor) {
    setForm((f) => ({ ...f, [campo]: valor }));
  }

  async function salvar(e) {
    e.preventDefault(); setErro("");
    if (!String(form.AIT || "").trim() && !String(form["ID interno"] || "").trim()) {
      setErro("Informe o AIT ou o ID interno para identificar a infração."); return;
    }
    if (!veiculosSistema.some((v) => v.__placa === String(form["Placa"] || ""))) {
      setErro("Selecione um veículo cadastrado no menu Veículos para registrar esta multa."); return;
    }
    if (form["Condutor identificado"] && !condutoresSistema.some((d) => d.__nome === String(form["Condutor identificado"]))) {
      setErro("O condutor informado não foi encontrado no cadastro Condutores. Selecione um condutor cadastrado ou deixe em branco até identificá-lo."); return;
    }
    const duplicado = registros.findIndex((r, i) => i !== editIndex && (
      (form.AIT && String(r.AIT || "").trim().toLowerCase() === String(form.AIT).trim().toLowerCase()) ||
      (form["ID interno"] && String(r["ID interno"] || "").trim().toLowerCase() === String(form["ID interno"]).trim().toLowerCase())
    ));
    if (duplicado >= 0) { setErro("Já existe uma multa com esse AIT ou ID interno. Abra o registro existente para atualizá-lo."); return; }

    setSalvando(true);
    try {
      const now = new Date().toISOString();
      const anterior = editIndex !== null ? registros[editIndex] : null;
      const etapaMudou = !anterior || anterior["Etapa atual"] !== form["Etapa atual"];
      let anexos = Array.isArray(form.Anexos) ? [...form.Anexos] : [];
      if (arquivos.length) {
        const storage = getStorage();
        for (const file of arquivos) {
          const path = `multas/${slug(form.AIT || form["ID interno"])}-${Date.now()}/${Date.now()}-${slug(file.name)}`;
          const fileRef = ref(storage, path);
          await uploadBytes(fileRef, file, { contentType: file.type || "application/octet-stream" });
          anexos.push({ nome: file.name, tipo: file.type || "Arquivo", tamanho: file.size, url: await getDownloadURL(fileRef), caminho: path, enviadoEm: now });
        }
      }
      const historico = Array.isArray(form["Histórico de etapas"]) ? [...form["Histórico de etapas"]] : [];
      if (etapaMudou) historico.push({ etapa: form["Etapa atual"], data: now, observacao: form["Observações finais"] || "" });
      const dadosAtualizados = { ...form };
      if (form["Etapa atual"] === "Enviado ao RH" && !dadosAtualizados["Data de envio ao RH"]) dadosAtualizados["Data de envio ao RH"] = now.slice(0, 16);
      const novoRegistro = { ...dadosAtualizados, Anexos: anexos, "Histórico de etapas": historico, "Data de criação": anterior?.["Data de criação"] || now, "Última atualização": now };
      if (editIndex !== null) {
        setRegistros((current) => current.map((r, i) => i === editIndex ? { ...novoRegistro, __docId: r.__docId } : r));
      } else {
        setRegistros((current) => [...current, novoRegistro]);
      }
      setForm(vazio()); setEditIndex(null); setArquivos([]); setAba("lista");
    } catch (err) {
      console.error("Erro ao salvar processo de multa", err);
      setErro("Não foi possível salvar ou enviar os anexos. Confira as permissões do Firestore/Storage e tente novamente. Os arquivos podem precisar ser selecionados novamente.");
    } finally { setSalvando(false); }
  }

  async function excluir(index) {
    if (!confirm("Excluir permanentemente este processo de multa?")) return;
    await removeRegistro(registros[index]);
  }

  function baixarModelo() {
    const ws = XLSX.utils.json_to_sheet([vazio()], { header: CAMPOS });
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Controle de Multas");
    XLSX.writeFile(wb, "modelo_controle_multas.xlsx");
  }
  async function importarArquivo(file) {
    setErro("");
    try {
      const wb = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: true });
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: "", raw: false });
      if (!rows.length) { setErro("A planilha está vazia."); return; }
      const normaliza = (s) => String(s).trim().replace(/\s+/g, " ").toLowerCase();
      const mapa = new Map(CAMPOS.map((c) => [normaliza(c), c]));
      let adicionados = 0, ignorados = 0;
      const novos = [];
      rows.forEach((row) => {
        const item = vazio();
        Object.entries(row).forEach(([k, v]) => { const campo = mapa.get(normaliza(k)); if (campo) item[campo] = v == null ? "" : String(v); });
        const exists = registros.some((r) => (item.AIT && String(r.AIT || "").trim().toLowerCase() === String(item.AIT).trim().toLowerCase()) || (item["ID interno"] && String(r["ID interno"] || "").trim().toLowerCase() === String(item["ID interno"]).trim().toLowerCase()));
        if (exists || (!item.AIT && !item["ID interno"])) ignorados++; else { novos.push(item); adicionados++; }
      });
      if (novos.length) setRegistros((current) => [...current, ...novos]);
      setErro(`Importação analisada: ${adicionados} novo(s) registro(s) para adicionar; ${ignorados} linha(s) ignoradas por duplicidade ou falta de AIT/ID. Registros existentes não foram sobrescritos.`);
    } catch (err) {
      console.error(err); setErro("Falha ao ler a planilha. Use .xlsx, .xls ou .csv.");
    }
  }

  const inputField = ([campo, tipo, obrigatorio, opcoes]) => (
    <label key={campo} className={`fine-field ${tipo === "textarea" ? "fine-field-wide" : ""}`}>
      <span>{campo}{obrigatorio ? " *" : ""}</span>
      {campo === "Placa" ? <select value={form[campo] ?? ""} onChange={(e) => {
        const placa = e.target.value;
        const veiculo = veiculosSistema.find((v) => v.__placa === placa);
        setForm((f) => ({ ...f, "Placa": placa, "Número da frota": veiculo?.__frota || "", "Modelo do veículo": veiculo?.__modelo || "", "Propriedade / locadora": veiculo?.__propriedade || "" }));
      }} required disabled={cadastrosLoading || veiculosSistema.length === 0}>
        <option value="">{cadastrosLoading ? "Carregando veículos..." : veiculosSistema.length ? "Selecione um veículo cadastrado..." : "Nenhum veículo cadastrado"}</option>
        {form[campo] && !veiculosSistema.some((v) => v.__placa === form[campo]) && <option value={form[campo]}>{form[campo]} — não localizado no cadastro</option>}
        {veiculosSistema.map((v) => <option key={v.__id} value={v.__placa}>{v.__placa}{v.__frota ? ` · Frota ${v.__frota}` : ""}{v.__modelo ? ` · ${v.__modelo}` : ""}</option>)}
      </select> : campo === "Condutor identificado" ? <select value={form[campo] ?? ""} onChange={(e) => {
        const nome = e.target.value;
        const condutor = condutoresSistema.find((d) => d.__nome === nome);
        setForm((f) => ({ ...f, "Condutor identificado": nome, "Matrícula do condutor": condutor?.__matricula || "" }));
      }} disabled={cadastrosLoading || condutoresSistema.length === 0}>
        <option value="">{cadastrosLoading ? "Carregando condutores..." : "Ainda não identificado"}</option>
        {form[campo] && !condutoresSistema.some((d) => d.__nome === form[campo]) && <option value={form[campo]}>{form[campo]} — não localizado no cadastro</option>}
        {condutoresSistema.map((d) => <option key={d.__id} value={d.__nome}>{d.__nome}{d.__matricula ? ` · ${d.__matricula}` : ""}</option>)}
      </select> : tipo === "select" ? <select value={form[campo] ?? ""} onChange={(e) => onChange(campo, e.target.value)} required={!!obrigatorio}>
        <option value="">Selecione...</option>{opcoes.map((o) => <option key={o} value={o}>{o}</option>)}
      </select> : tipo === "textarea" ? <textarea rows={3} value={form[campo] ?? ""} onChange={(e) => onChange(campo, e.target.value)} /> :
        <input type={tipo} min={tipo === "number" ? "0" : undefined} step={tipo === "number" && campo.includes("Valor") ? "0.01" : "1"} value={form[campo] ?? ""} onChange={(e) => onChange(campo, e.target.value)} required={!!obrigatorio} />}
    </label>
  );

  return <div className="fines-app">
    <section className="fine-overview">
      <div className="fine-overview-title"><div><span className="fine-kicker">CONTROLE DE PROCESSOS</span><h2>Gestão de multas</h2><p>Registre a infração, avance as etapas e reúna evidências até o envio ao RH.</p></div><button type="button" className="fine-primary" onClick={novo}>＋ Nova infração</button></div>
      <div className="fine-kpis">
        <div className="fine-kpi"><span>Em acompanhamento</span><strong>{abertas.length}</strong><small>Processos ainda não enviados ao RH</small></div>
        <div className="fine-kpi fine-kpi-alert"><span>Prazo legal vencido</span><strong>{vencidas.length}</strong><small>Confira o prazo e a situação de cada processo</small></div>
        <div className="fine-kpi fine-kpi-done"><span>Enviadas ao RH</span><strong>{enviadasRh.length}</strong><small>Etapa final concluída no PPCM</small></div>
      </div>
    </section>

    <div className="fine-toolbar">
      <div className="fine-search"><span>⌕</span><input placeholder="Buscar por AIT, placa, condutor, gestor..." value={busca} onChange={(e) => setBusca(e.target.value)} /></div>
      <select aria-label="Filtrar etapa" value={filtroEtapa} onChange={(e) => setFiltroEtapa(e.target.value)}><option>Todas</option><option>Em acompanhamento</option>{ETAPAS.map((etapa) => <option key={etapa}>{etapa}</option>)}</select>
      <button type="button" className="fine-secondary" onClick={baixarModelo}>Baixar modelo Excel</button>
      <button type="button" className="fine-secondary" onClick={() => setAba(aba === "importar" ? "lista" : "importar")}>Importar</button>
    </div>

    {cadastrosErro && <div className="fine-error" role="alert">{cadastrosErro}</div>}
    {aba === "importar" && <section className="fine-panel fine-import"><h3>Importar processos existentes</h3><p>Importa apenas linhas com AIT ou ID interno ainda não cadastrado. Não sobrescreve registros existentes.</p><input type="file" accept=".xlsx,.xls,.csv" onChange={(e) => { const f = e.target.files?.[0]; if (f) importarArquivo(f); e.target.value = ""; }} /><p className="fine-message">A planilha deve usar os cabeçalhos do modelo Excel.</p>{erro && <p className="fine-error">{erro}</p>}</section>}

    {aba === "form" ? <form className="fine-editor" onSubmit={salvar}>
      <div className="fine-editor-head"><div><span className="fine-kicker">{editIndex !== null ? "ATUALIZAR PROCESSO" : "NOVO REGISTRO"}</span><h2>{editIndex !== null ? `Infração ${form.AIT || form["ID interno"]}` : "Cadastrar infração"}</h2><p>Preencha o que já souber. Você pode salvar e completar os dados conforme o processo evolui.</p></div><button type="button" className="fine-secondary" onClick={() => setAba("lista")}>Voltar à lista</button></div>
      <section className="fine-panel fine-stage-panel"><div><label className="fine-stage-label" htmlFor="etapa-multa">Etapa atual do processo</label><p>Altere esta etapa manualmente conforme executar cada ação.</p></div><select id="etapa-multa" value={form["Etapa atual"] || ETAPAS[0]} onChange={(e) => onChange("Etapa atual", e.target.value)}>{ETAPAS.map((etapa) => <option key={etapa}>{etapa}</option>)}</select><div className="fine-progress">{ETAPAS.map((etapa, i) => <div key={etapa} className={`fine-progress-step ${ETAPAS.indexOf(form["Etapa atual"]) >= i ? "is-reached" : ""}`}><span>{i + 1}</span><small>{etapa}</small></div>)}</div></section>
      {GRUPOS.map((grupo) => <fieldset className="fine-panel fine-fieldset" key={grupo.titulo}><legend>{grupo.titulo}</legend><p>{grupo.ajuda}</p><div className="fine-fields">{grupo.campos.map(inputField)}</div></fieldset>)}
      <section className="fine-panel fine-attachments"><div><h3>Fotos, documentos e assinaturas</h3><p>Anexe notificações, fotos, termos assinados, protocolos e outras evidências relacionadas à multa.</p></div><label className="fine-upload"><span>＋ Selecionar arquivos</span><input ref={fileRef} type="file" multiple accept="image/*,.pdf,.doc,.docx,.jpg,.jpeg,.png" onChange={(e) => setArquivos((prev) => [...prev, ...Array.from(e.target.files || [])])} /></label>
        {arquivos.length > 0 && <ul className="fine-file-list">{arquivos.map((f, i) => <li key={f.name + i}><span>📎 {f.name}</span><button type="button" onClick={() => setArquivos((prev) => prev.filter((_, j) => j !== i))}>Remover</button></li>)}</ul>}
        {Array.isArray(form.Anexos) && form.Anexos.length > 0 && <div className="fine-existing-files"><strong>Arquivos já anexados</strong>{form.Anexos.map((a, i) => <div key={a.caminho || a.url || i}><a href={a.url} target="_blank" rel="noreferrer">{a.nome || "Abrir anexo"}</a><button type="button" onClick={() => onChange("Anexos", form.Anexos.filter((_, j) => j !== i))}>Remover da ficha</button></div>)}</div>}
      </section>
      <section className="fine-panel fine-history"><h3>Histórico de etapas</h3><p>O sistema registra a data da alteração quando você salva uma nova etapa.</p>{Array.isArray(form["Histórico de etapas"]) && form["Histórico de etapas"].length ? <ol>{form["Histórico de etapas"].slice().reverse().map((h, i) => <li key={i}><strong>{h.etapa}</strong><span>{new Date(h.data).toLocaleString("pt-BR")}</span></li>)}</ol> : <p className="fine-empty">O histórico será criado ao salvar o registro.</p>}</section>
      {erro && <div className="fine-error">{erro}</div>}
      <div className="fine-form-actions"><button type="button" className="fine-secondary" onClick={() => setAba("lista")}>Cancelar</button><button type="submit" className="fine-primary" disabled={salvando}>{salvando ? "Salvando..." : "Salvar processo"}</button></div>
    </form> : aba === "lista" ? <section className="fine-card-grid">
      {lista.length === 0 && <div className="fine-empty-card"><span>▤</span><h3>Nenhuma infração encontrada</h3><p>Cadastre a primeira infração ou ajuste os filtros da busca.</p><button className="fine-primary" onClick={novo}>Cadastrar infração</button></div>}
      {lista.map((r) => { const idx = registros.indexOf(r); const etapa = r["Etapa atual"] || ETAPAS[0]; const done = etapa === "Enviado ao RH"; const late = !done && r["Prazo legal para indicação"] && new Date(r["Prazo legal para indicação"] + "T23:59:59") < new Date(); return <article className="fine-process-card" key={r.__docId || r.AIT || idx}>
        <div className="fine-card-top"><span className={`fine-status ${done ? "status-done" : late ? "status-late" : "status-open"}`}>{done ? "Enviado ao RH" : late ? "Prazo vencido" : "Em andamento"}</span><button className="fine-more" title="Editar processo" onClick={() => editar(idx)}>✎</button></div>
        <div className="fine-card-title"><h3>{r.AIT || "AIT não informado"}</h3><span>{r["Placa"] || "Sem placa"}</span></div>
        <p className="fine-card-description">{r["Descrição da infração"] || "Descrição da infração ainda não preenchida"}</p>
        <div className="fine-card-facts"><div><small>Data da infração</small><strong>{fmt(r["Data e hora da infração"])}</strong></div><div><small>Prazo legal</small><strong className={late ? "fine-text-danger" : ""}>{fmt(r["Prazo legal para indicação"])}</strong></div><div><small>Condutor</small><strong>{r["Condutor identificado"] || "A identificar"}</strong></div><div><small>Valor</small><strong>{r["Valor da multa (R$)"] !== "" && r["Valor da multa (R$)"] != null ? Number(r["Valor da multa (R$)"]).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "Não informado"}</strong></div></div>
        <div className="fine-card-stage"><span>Etapa atual</span><strong>{etapa}</strong><div className="fine-card-progress"><i style={{ width: ((ETAPAS.indexOf(etapa) + 1) / ETAPAS.length * 100) + "%" }} /></div></div>
        <div className="fine-card-bottom"><span>📎 {(r.Anexos || []).length} anexo(s)</span><button onClick={() => editar(idx)}>Abrir processo →</button><button className="fine-delete" onClick={() => excluir(idx)} aria-label="Excluir processo">Excluir</button></div>
      </article>; })}
    </section> : null}
  </div>;
}
