// src/Funcionarios.jsx
import React, { useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";

/**
 * Lista COMPLETA de campos do cadastro de Funcionários
 * (conforme cabeçalho informado)
 */
export const CAMPOS_FUNCIONARIO = [
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

/** campos exibidos na tabela por padrão */
const CAMPOS_TABELA = [
  "Matricula",
  "Nome",
  "Status",
  "Data Admissao",
  "Funcao Descricao",
  "Nome Departamento",
  "Gestor",
  "CPF",
  "Municipio de Trabalho",
  "Sit. Folha",
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
  const [funcionarios, setFuncionarios] = useState([]);
  const [form, setForm] = useState(vazio());
  const [editIndex, setEditIndex] = useState(null);
  const [aba, setAba] = useState("lista"); // lista | form | importar
  const [busca, setBusca] = useState("");
  const [erroImport, setErroImport] = useState("");
  const fileRef = useRef(null);

  const listaFiltrada = useMemo(() => {
    if (!busca.trim()) return funcionarios;
    const q = busca.toLowerCase();
    return funcionarios.filter((f) =>
      [
        f["Matricula"],
        f["Nome"],
        f["CPF"],
        f["Funcao Descricao"],
        f["Nome Departamento"],
        f["Municipio de Trabalho"],
      ]
        .filter(Boolean)
        .some((x) => String(x).toLowerCase().includes(q))
    );
  }, [funcionarios, busca]);

  function onChange(campo, valor) {
    setForm((f) => ({ ...f, [campo]: valor }));
  }

  function salvar(e) {
    e.preventDefault();
    if (!form["Matricula"] && !form["CPF"] && !form["Nome"]) {
      alert("Informe ao menos Matrícula, CPF ou Nome.");
      return;
    }
    if (editIndex !== null) {
      const copia = [...funcionarios];
      copia[editIndex] = form;
      setFuncionarios(copia);
    } else {
      setFuncionarios((v) => [...v, form]);
    }
    setForm(vazio());
    setEditIndex(null);
    setAba("lista");
  }

  function editar(i) {
    setForm({ ...vazio(), ...funcionarios[i] });
    setEditIndex(i);
    setAba("form");
  }

  function excluir(i) {
    if (!confirm("Excluir este funcionário?")) return;
    setFuncionarios((v) => v.filter((_, idx) => idx !== i));
  }

  function novo() {
    setForm(vazio());
    setEditIndex(null);
    setAba("form");
  }

  // ---------------- IMPORTAR PLANILHA ----------------
  function baixarModelo() {
    const ws = XLSX.utils.json_to_sheet([vazio()], {
      header: CAMPOS_FUNCIONARIO,
    });
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

      // mapa: cabeçalho planilha -> campo interno
      const mapaCabecalho = new Map();
      CAMPOS_FUNCIONARIO.forEach((c) => {
        mapaCabecalho.set(normaliza(c).toLowerCase(), c);
      });
      Object.entries(ALIAS_IMPORTACAO).forEach(([origem, destino]) => {
        mapaCabecalho.set(normaliza(origem).toLowerCase(), destino);
      });

      const importados = dados.map((linha) => {
        const obj = vazio();
        Object.entries(linha).forEach(([k, v]) => {
          const campo = mapaCabecalho.get(normaliza(k).toLowerCase());
          if (campo && campo in obj) {
            obj[campo] = v == null ? "" : String(v);
          }
        });
        return obj;
      });

      setFuncionarios((atual) => [...atual, ...importados]);
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
        <h1 className="text-xl font-semibold">Funcionários</h1>
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
            Novo Funcionário
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
              placeholder="Buscar por matrícula, nome, CPF, função, depto..."
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
                      Nenhum funcionário cadastrado.
                    </td>
                  </tr>
                )}
                {listaFiltrada.map((f) => {
                  const idxReal = funcionarios.indexOf(f);
                  return (
                    <tr key={idxReal} className="border-t">
                      {CAMPOS_TABELA.map((c) => (
                        <td key={c} className="px-3 py-2">
                          {f[c]}
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
            {editIndex !== null ? "Editar funcionário" : "Novo funcionário"}
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {CAMPOS_FUNCIONARIO.map((campo) => (
              <label
                key={campo}
                className="flex flex-col text-sm"
              >
                <span className="text-xs text-muted mb-1">{campo}</span>
                <input
                  value={form[campo] ?? ""}
                  onChange={(e) => onChange(campo, e.target.value)}
                  className="px-2 py-1.5 border rounded-md"
                />
              </label>
            ))}
          </div>

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
            Importar planilha de funcionários
          </h2>
          <p className="text-sm text-muted mb-3">
            Formatos aceitos: <b>.xlsx</b>, <b>.xls</b>, <b>.csv</b>. A primeira
            linha deve conter os cabeçalhos iguais aos campos abaixo (não precisa
            ter todos, apenas os que deseja importar).
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
              Campos esperados ({CAMPOS_FUNCIONARIO.length})
            </summary>
            <ul className="columns-2 md:columns-3 gap-6 text-xs mt-2 max-h-60 overflow-auto">
              {CAMPOS_FUNCIONARIO.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </details>
        </section>
      )}
    </div>
  );
}