// src/Multas.jsx
import React, { useMemo, useRef, useState } from "react";
import { useFirestoreCollection } from "./firestoreSync";
import * as XLSX from "xlsx";

/**
 * Grupos visuais (somente para organizar o formulário/legenda).
 * NÃO afetam a importação — só a UX.
 */
export const GRUPOS_MULTAS = {
  "DADOS DA INFRAÇÃO": [
    "AIT",
    "ID",
    "Data/Hora Recebimento do E-mail",
    "Placa do Veículo",
    "Data/Hora da Infração",
    "Local / Descrição Breve da Infração",
    "Prazo Limite Legal de Indicação",
  ],
  "IDENTIFICAÇÃO E DECISÃO": [
    "Condutor Identificado (via Telemetria Cobli)",
    "Gestor Responsável",
    "Data/Hora Envio Notificação ao Gestor",
    "Indicação do Condutor (Sim / Não)",
    "Data/Hora Retorno do Gestor",
  ],
  "ACEITE E DOCUMENTAÇÃO": [
    "Data/Hora Envio Termo para Assinatura",
    "Data/Hora Retorno Termo Assinado",
    "Locadora",
  ],
  "INDICAÇÃO DO CONDUTOR": [
    "Data/Hora da Indicação",
    "Data/Hora do Processo de Indicação Validado",
  ],
  "CONCLUSÃO E RH": [
    "Data/Hora Envio ao RH",
    "Consequência / Encaminhamento",
    "SLA / Tempo Total",
  ],
};

/**
 * Lista COMPLETA de campos (na ordem em que aparecem no formulário)
 */
export const CAMPOS_MULTA = [
  "Status do Processo",
  // DADOS DA INFRAÇÃO
  "AIT",
  "ID",
  "Data/Hora Recebimento do E-mail",
  "Placa do Veículo",
  "Data/Hora da Infração",
  "Local / Descrição Breve da Infração",
  "Prazo Limite Legal de Indicação",
  // IDENTIFICAÇÃO E DECISÃO
  "Condutor Identificado (via Telemetria Cobli)",
  "Gestor Responsável",
  "Data/Hora Envio Notificação ao Gestor",
  "Indicação do Condutor (Sim / Não)",
  "Data/Hora Retorno do Gestor",
  // ACEITE E DOCUMENTAÇÃO
  "Data/Hora Envio Termo para Assinatura",
  "Data/Hora Retorno Termo Assinado",
  "Locadora",
  // INDICAÇÃO DO CONDUTOR
  "Data/Hora da Indicação",
  "Data/Hora do Processo de Indicação Validado",
  // CONCLUSÃO E RH
  "Data/Hora Envio ao RH",
  "Consequência / Encaminhamento",
  "SLA / Tempo Total",
];

/** campos exibidos na tabela por padrão */
const CAMPOS_TABELA = [
  "Status do Processo",
  "AIT",
  "ID",
  "Placa do Veículo",
  "Data/Hora da Infração",
  "Prazo Limite Legal de Indicação",
  "Gestor Responsável",
  "Indicação do Condutor (Sim / Não)",
  "Locadora",
  "SLA / Tempo Total",
];

const vazio = () =>
  CAMPOS_MULTA.reduce((acc, c) => ({ ...acc, [c]: "" }), {});

export default function Multas() {
  const [registros, setRegistros, removeRegistro] = useFirestoreCollection("multas", (r) => r["ID"] || r["AIT"] || r.id);
  const [form, setForm] = useState(vazio());
  const [editIndex, setEditIndex] = useState(null);
  const [aba, setAba] = useState("lista"); // lista | form | importar
  const [busca, setBusca] = useState("");
  const [erroImport, setErroImport] = useState("");
  const fileRef = useRef(null);

  const listaFiltrada = useMemo(() => {
    if (!busca.trim()) return registros;
    const q = busca.toLowerCase();
    return registros.filter((r) =>
      [
        r["AIT"],
        r["ID"],
        r["Placa do Veículo"],
        r["Gestor Responsável"],
        r["Locadora"],
        r["Status do Processo"],
      ]
        .filter(Boolean)
        .some((x) => String(x).toLowerCase().includes(q))
    );
  }, [registros, busca]);

  function onChange(campo, valor) {
    setForm((f) => ({ ...f, [campo]: valor }));
  }

  function salvar(e) {
    e.preventDefault();
    if (!form["AIT"] && !form["ID"]) {
      alert("Informe ao menos AIT ou ID.");
      return;
    }
    if (editIndex !== null) {
      const copia = [...registros];
      copia[editIndex] = form;
      setRegistros(copia);
    } else {
      setRegistros((v) => [...v, form]);
    }
    setForm(vazio());
    setEditIndex(null);
    setAba("lista");
  }

  function editar(i) {
    setForm({ ...vazio(), ...registros[i] });
    setEditIndex(i);
    setAba("form");
  }

  async function excluir(i) {
    if (!confirm("Excluir esta multa?")) return;
    await removeRegistro(registros[i]);
  }

  function novo() {
    setForm(vazio());
    setEditIndex(null);
    setAba("form");
  }

  // ---------------- IMPORTAR PLANILHA ----------------
  function baixarModelo() {
    // Gera uma aba por grupo? Não — o cabeçalho do Excel é uma linha só.
    // Mantemos todos os campos na linha 1 e, na linha 2, um registro em branco.
    const ws = XLSX.utils.json_to_sheet([vazio()], { header: CAMPOS_MULTA });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Multas");
    XLSX.writeFile(wb, "modelo_multas.xlsx");
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

      const normaliza = (s) =>
        String(s).trim().replace(/\s+/g, " ").toLowerCase();

      const mapaCabecalho = new Map(
        CAMPOS_MULTA.map((c) => [normaliza(c), c])
      );

      const importados = dados.map((linha) => {
        const obj = vazio();
        Object.entries(linha).forEach(([k, v]) => {
          const campo = mapaCabecalho.get(normaliza(k));
          if (campo && campo in obj) {
            obj[campo] = v == null ? "" : String(v);
          }
        });
        return obj;
      });

      setRegistros((atual) => [...atual, ...importados]);
      setAba("lista");
    } catch (err) {
      console.error(err);
      setErroImport("Falha ao ler arquivo. Use .xlsx, .xls ou .csv.");
    }
  }

  // ---------------------------------------------------

  return (
    <div className="font-sans">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">Multas</h1>
        <nav className="flex gap-2">
          <button
            onClick={() => setAba("lista")}
            className={`px-3 py-1.5 rounded-md text-sm border ${
              aba === "lista"
                ? "bg-brand-600 text-white border-brand-600"
                : "bg-white hover:bg-surface"
            }`}
          >
            Lista
          </button>
          <button
            onClick={novo}
            className="px-3 py-1.5 rounded-md text-sm bg-brand-600 text-white"
          >
            Nova Multa
          </button>
          <button
            onClick={() => setAba("importar")}
            className={`px-3 py-1.5 rounded-md text-sm border ${
              aba === "importar"
                ? "bg-brand-600 text-white border-brand-600"
                : "bg-white hover:bg-surface"
            }`}
          >
            Importar Planilha
          </button>
        </nav>
      </div>

      {/* LISTA */}
      {aba === "lista" && (
        <section>
          <div className="flex gap-2 mb-3">
            <input
              placeholder="Buscar por AIT, ID, placa, gestor, locadora..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="flex-1 px-3 py-2 border rounded-md text-sm"
            />
            <button
              onClick={baixarModelo}
              className="px-3 py-2 text-sm border rounded-md bg-white hover:bg-surface"
            >
              Baixar modelo
            </button>
          </div>

          <div className="overflow-x-auto border rounded-md">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left">
                <tr>
                  {CAMPOS_TABELA.map((c) => (
                    <th key={c} className="px-3 py-2 font-medium">
                      {c}
                    </th>
                  ))}
                  <th className="px-3 py-2 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {listaFiltrada.length === 0 && (
                  <tr>
                    <td
                      colSpan={CAMPOS_TABELA.length + 1}
                      className="px-3 py-4 text-center text-muted"
                    >
                      Nenhuma multa cadastrada.
                    </td>
                  </tr>
                )}
                {listaFiltrada.map((r) => {
                  const idxReal = registros.indexOf(r);
                  return (
                    <tr key={idxReal} className="border-t">
                      {CAMPOS_TABELA.map((c) => (
                        <td key={c} className="px-3 py-2">
                          {r[c]}
                        </td>
                      ))}
                      <td className="px-3 py-2 whitespace-nowrap">
                        <button
                          onClick={() => editar(idxReal)}
                          className="text-brand-700 hover:underline mr-3"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => excluir(idxReal)}
                          className="text-red-600 hover:underline"
                        >
                          Excluir
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* FORMULÁRIO */}
      {aba === "form" && (
        <form onSubmit={salvar}>
          <h2 className="text-lg font-semibold mb-3">
            {editIndex !== null ? "Editar multa" : "Nova multa"}
          </h2>

          {/* Status do Processo (destacado) */}
          <div className="mb-4">
            <label className="flex flex-col text-sm max-w-xs">
              <span className="text-xs text-muted mb-1">
                Status do Processo
              </span>
              <input
                value={form["Status do Processo"] ?? ""}
                onChange={(e) => onChange("Status do Processo", e.target.value)}
                className="px-2 py-1.5 border rounded-md"
              />
            </label>
          </div>

          {/* Grupos */}
          {Object.entries(GRUPOS_MULTAS).map(([grupo, campos]) => (
            <fieldset
              key={grupo}
              className="border rounded-md p-3 mb-4"
            >
              <legend className="px-2 text-xs font-semibold text-brand-700 uppercase">
                {grupo}
              </legend>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {campos.map((campo) => (
                  <label key={campo} className="flex flex-col text-sm">
                    <span className="text-xs text-muted mb-1">{campo}</span>
                    <input
                      value={form[campo] ?? ""}
                      onChange={(e) => onChange(campo, e.target.value)}
                      className="px-2 py-1.5 border rounded-md"
                    />
                  </label>
                ))}
              </div>
            </fieldset>
          ))}

          <div className="mt-4 flex gap-2">
            <button
              type="submit"
              className="px-3 py-1.5 rounded-md text-sm bg-brand-600 text-white"
            >
              Salvar
            </button>
            <button
              type="button"
              onClick={() => {
                setAba("lista");
                setEditIndex(null);
              }}
              className="px-3 py-1.5 rounded-md text-sm border bg-white hover:bg-surface"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* IMPORTAR */}
      {aba === "importar" && (
        <section>
          <h2 className="text-lg font-semibold mb-2">
            Importar planilha de multas
          </h2>
          <p className="text-sm text-muted mb-3">
            Formatos aceitos: <b>.xlsx</b>, <b>.xls</b>, <b>.csv</b>. A primeira
            linha deve conter os cabeçalhos iguais aos campos abaixo.
          </p>
          <div className="flex gap-2 mb-3">
            <button
              onClick={baixarModelo}
              className="px-3 py-2 text-sm border rounded-md bg-white hover:bg-surface"
            >
              Baixar modelo (.xlsx)
            </button>
            <button
              onClick={() => fileRef.current?.click()}
              className="px-3 py-2 text-sm bg-brand-600 text-white rounded-md"
            >
              Selecionar arquivo
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) importarArquivo(f);
                e.target.value = "";
              }}
            />
          </div>

          {erroImport && <p className="text-red-600 text-sm">{erroImport}</p>}

          <details className="text-sm mt-2">
            <summary className="cursor-pointer">
              Campos esperados ({CAMPOS_MULTA.length})
            </summary>
            <ul className="columns-2 md:columns-3 gap-6 text-xs mt-2">
              {CAMPOS_MULTA.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </details>
        </section>
      )}
    </div>
  );
}