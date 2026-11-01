import React, { useMemo, useRef, useState } from "react";
import { useFirestoreCollection } from "./firestoreSync";
import * as XLSX from "xlsx";

/**
 * Lista COMPLETA de campos conforme o cabeçalho do arquivo
 * idPlacaNº FrotaStatusModeloVersãoModelo.txt
 */
export const CAMPOS_VEICULO = [
  "id",
  "Placa",
  "Nº Frota",
  "Status",
  "Modelo",
  "Versão",
  "Modelo Completo",
  "Cor",
  "Marca",
  "Hodometro",
  "Último Comentário",
  "Propriedade",
  "Status Veículo",
  "Movimentado em",
  "Dias Corridos",
  "Oficina",
  "Condutor",
  "Matrícula",
  "CPF",
  "Cargo",
  "Tipo Vínculo Condutor",
  "Carro Benefício",
  "Tipo Condutor Veículo",
  "Data Entrega Condutor",
  "Data Devolução Condutor",
  "Tipo Veículo",
  "Tipo Frota",
  "Aplicação",
  "Categoria",
  "Operação Horário",
  "Situação",
  "Pais",
  "Região",
  "Sub Região",
  "Unidade",
  "Base Gestão",
  "Base Operacional",
  "Divisão",
  "Vice Presidência",
  "Diretoria",
  "Gerência",
  "Coordenação",
  "Supervisão",
  "Centro Custo",
  "Centro Custo Descrição",
  "Ordem Custeio",
  "Ano Fabricação",
  "Ano Modelo",
  "Idade",
  "Código Patrimônio",
  "Item Contábil",
  "Classe Valor",
  "Código Fipe",
  "Combustível",
  "Motorização",
  "Chassi",
  "Nº Portas",
  "Renavam",
  "UF Emplacamento",
  "Licenciamento Ano Exercício (IPVA)",
  "Licenciamento Isento (IPVA)",
  "Licenciamento Status Pagamento (IPVA)",
  "Licencimento Data Vencto (IPVA)",
  "Licencimento Data Pagto (IPVA)",
  "Licenciamento Valor (IPVA)",
  "Licenciamento Valor",
  "Possui DUT",
  "Documento Data Limite (CRLV)",
  "Documento Ano (CRLV)",
  "Documento Ano Arquivo (CRLV)",
  "Seguro Ano",
  "Seguro Corporativo",
  "Seguro Inicio Vigência",
  "Seguro Fim Vigência",
  "Seguro Parcelamento",
  "Seguro Parcela Vencida",
  "Isento Rodízio Placa",
  "Isento Rodízio Placa Data Vencimento",
  "Air Bag",
  "Zero KM",
  "Hodometro Compra/Implantação",
  "Elegível Rastreador",
  "Possui Rastreador",
  "Rastreador Nº Módulo",
  "Rastreador Valor Mensal",
  "Rastreador Data Instalação",
  "Rastreador Identificador",
  "Rastreador Acelerometro",
  "GNV",
  "GNV Validade",
  "Rack",
  "TAG Pedágio",
  "Locadora",
  "Nº Contrato Locação (Pedido)",
  "Nº Contrato Locação",
  "Número Contrato Interno",
  "Data Incoporação",
  "Cnpj Unidade",
  "Data Aquisição/Disponibilização",
  "Data Previsão Devolução",
  "Mês/Ano Previsão Devolução",
  "Data Devolução Sem Multa",
  "Data Devolução Carência",
  "Data Devolução Locadora",
  "Data Desativação Sistema",
  "Valor Aquisição/Locação",
  "Franquia Km",
  "Valor Km Inferior",
  "Valor Km Excedente",
  "Valor Franquia Seguro",
  "Valor Benefício Função",
  "Taxa Depreciação Anual",
  "Valor Calculado Depreciação",
  "Politica Frota/Termo",
  "Plano Agregamento",
  "Código Fornecedor Agregamento",
  "Código Bonificação Agregamento",
  "Carro é do Agregado",
  "Carro Agregado em Nome de",
  "Total Km Rodado Mês Atual",
  "Local Rodagem",
  "Plano Recorrência Checklist",
  "Checklist Pendência",
  "Checklist",
  "Checklist Tipo",
  "Checklist Data",
  "Checklist Estado",
  "Checklist Tem Avarias",
  "Checklist Observação",
  "Plano Manutenção Preventiva",
  "Manutenção Preventiva Data",
  "Manutenção Preventiva Hodometro",
  "Plano Rodizio Pneus",
  "Rodizio Pneus Data",
  "Rodizio Pneus Hodometro",
  "Rastreador Data Última Posição",
  "Rastreador Último Hodometro",
  "Rastreador Último Status Ignição",
  "Última Data Abastecimento",
  "Município Último Abastecimento",
  "Matrícula Último Abastecimento",
  "Condutor Último Abastecimento",
  "Hodometro Último Abastecimento",
  "Placa Anterior",
  "Registro criado em",
  "Atualizado em",
  "Por",
  "Empresa Proprietária",
  "Empresa Alocada",
  "Consulta Ficha Técnica",
  "Tem Catalogo Peças",
  "Nº Motor",
  "Qtde Eixos",
  "Qtde Pneus",
  "Qtde Estepe",
  "Tara",
  "Lotação",
  "Peso Bruto",
  "CMT",
  "Qtd Equipamentos Vinculados",
  "Cabine Auxiliar",
  "Carroceria",
  "Aterramento",
  "Dupla Isolação",
  "Capacidade Palet",
  "Capacidade Tanque",
  "Usa Arla",
  "Capacidade Tanque Arla",
  "Garantia Veículo Em Meses",
  "Tacografo",
  "Tacografo Tipo",
  "Tacografo Número Certificado",
  "Tacografo Data Validade",
  "Fumaça Preta Data Inspeção",
  "Fumaça Preta Data Limite",
  "Nível Blindagem",
  "Blindagem Data Instalação",
  "Blindagem Garantia em Meses",
  "Blindagem Data Final Garantia",
  "Valor Blindagem",
  "Valor Blindagem Acessório",
  "Valor Calculado Depreciação Blindagem",
  "Plotagem",
  "NFe",
  "CTe",
  "Responsável Imediato",
  "Responsável 2º Nível",
  "Responsável 3º Nível",
  "Responsável 4º Nível",
  "Responsável 5º Nível",
  "Responsável 6º Nível",
  "Medir Eficiência",
  "Tipo Placa",
  "Id Ticket",
];

/** campos que aparecem na tabela por padrão */
const CAMPOS_TABELA = [
  "Placa",
  "Nº Frota",
  "Status",
  "Modelo",
  "Marca",
  "Cor",
  "Hodometro",
  "Condutor",
  "Unidade",
  "Situação",
];

const vazio = () =>
  CAMPOS_VEICULO.reduce((acc, c) => ({ ...acc, [c]: "" }), {});

export default function Veiculos() {
  const [veiculos, setVeiculos, removeVeiculo] = useFirestoreCollection("veiculos", (v) => v.id || v["Placa"] || v["Nº Frota"]);
  const [form, setForm] = useState(vazio());
  const [editIndex, setEditIndex] = useState(null);
  const [aba, setAba] = useState("lista"); // lista | form | importar
  const [busca, setBusca] = useState("");
  const [erroImport, setErroImport] = useState("");
  const fileRef = useRef(null);

  const listaFiltrada = useMemo(() => {
    if (!busca.trim()) return veiculos;
    const q = busca.toLowerCase();
    return veiculos.filter((v) =>
      [v["Placa"], v["Nº Frota"], v["Modelo"], v["Condutor"], v["Unidade"]]
        .filter(Boolean)
        .some((x) => String(x).toLowerCase().includes(q))
    );
  }, [veiculos, busca]);

  function onChange(campo, valor) {
    setForm((f) => ({ ...f, [campo]: valor }));
  }

  function salvar(e) {
    e.preventDefault();
    if (!form["Placa"] && !form["Nº Frota"]) {
      alert("Informe ao menos Placa ou Nº Frota.");
      return;
    }
    if (editIndex !== null) {
      const copia = [...veiculos];
      copia[editIndex] = form;
      setVeiculos(copia);
    } else {
      setVeiculos((v) => [...v, form]);
    }
    setForm(vazio());
    setEditIndex(null);
    setAba("lista");
  }

  function editar(i) {
    setForm({ ...vazio(), ...veiculos[i] });
    setEditIndex(i);
    setAba("form");
  }

  async function excluir(i) {
    if (!confirm("Excluir este veículo?")) return;
    await removeVeiculo(veiculos[i]);
  }

  function novo() {
    setForm(vazio());
    setEditIndex(null);
    setAba("form");
  }

  // ---------------- IMPORTAR PLANILHA ----------------
  function baixarModelo() {
    const ws = XLSX.utils.json_to_sheet([vazio()], {
      header: CAMPOS_VEICULO,
    });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Veiculos");
    XLSX.writeFile(wb, "modelo_veiculos.xlsx");
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

      // normaliza cabeçalhos (tolera espaços extras)
      const normaliza = (s) => String(s).trim().replace(/\s+/g, " ");

      const mapaCabecalho = new Map(
        CAMPOS_VEICULO.map((c) => [normaliza(c).toLowerCase(), c])
      );

      const importados = dados.map((linha) => {
        const obj = vazio();
        Object.entries(linha).forEach(([k, v]) => {
          const campo = mapaCabecalho.get(normaliza(k).toLowerCase());
          if (campo) obj[campo] = v == null ? "" : String(v);
        });
        return obj;
      });

      setVeiculos((atual) => [...atual, ...importados]);
      setAba("lista");
    } catch (err) {
      console.error(err);
      setErroImport("Falha ao ler arquivo. Use .xlsx, .xls ou .csv.");
    }
  }

  // ---------------------------------------------------

  return (
    <div style={{ padding: 16, fontFamily: "system-ui, sans-serif" }}>
      <h1>Veículos</h1>

      {/* MENU */}
      <nav style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <button onClick={() => setAba("lista")} disabled={aba === "lista"}>
          Lista
        </button>
        <button onClick={novo}>Novo Veículo</button>
        <button onClick={() => setAba("importar")}>Importar Planilha</button>
      </nav>

      {/* LISTA */}
      {aba === "lista" && (
        <section>
          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <input
              placeholder="Buscar por placa, frota, modelo, condutor, unidade..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              style={{ flex: 1, padding: 8 }}
            />
            <button onClick={baixarModelo}>Baixar modelo</button>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table border="1" cellPadding="6" cellSpacing="0" width="100%">
              <thead style={{ background: "#f3f3f3" }}>
                <tr>
                  {CAMPOS_TABELA.map((c) => (
                    <th key={c}>{c}</th>
                  ))}
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {listaFiltrada.length === 0 && (
                  <tr>
                    <td colSpan={CAMPOS_TABELA.length + 1}>
                      Nenhum veículo cadastrado.
                    </td>
                  </tr>
                )}
                {listaFiltrada.map((v, i) => {
                  const idxReal = veiculos.indexOf(v);
                  return (
                    <tr key={idxReal}>
                      {CAMPOS_TABELA.map((c) => (
                        <td key={c}>{v[c]}</td>
                      ))}
                      <td style={{ whiteSpace: "nowrap" }}>
                        <button onClick={() => editar(idxReal)}>Editar</button>{" "}
                        <button onClick={() => excluir(idxReal)}>Excluir</button>
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
          <h2>{editIndex !== null ? "Editar veículo" : "Novo veículo"}</h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: 12,
            }}
          >
            {CAMPOS_VEICULO.map((campo) => (
              <label key={campo} style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ fontSize: 12, color: "#555" }}>{campo}</span>
                <input
                  value={form[campo] ?? ""}
                  onChange={(e) => onChange(campo, e.target.value)}
                  style={{ padding: 6 }}
                />
              </label>
            ))}
          </div>

          <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
            <button type="submit">Salvar</button>
            <button
              type="button"
              onClick={() => {
                setAba("lista");
                setEditIndex(null);
              }}
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* IMPORTAR */}
      {aba === "importar" && (
        <section>
          <h2>Importar planilha de veículos</h2>
          <p>
            Formatos aceitos: <b>.xlsx</b>, <b>.xls</b>, <b>.csv</b>. A primeira
            linha deve conter os cabeçalhos iguais aos campos abaixo (não precisa
            ter todos, apenas os que deseja importar).
          </p>
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <button onClick={baixarModelo}>Baixar modelo (.xlsx)</button>
            <button onClick={() => fileRef.current?.click()}>
              Selecionar arquivo
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              style={{ display: "none" }}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) importarArquivo(f);
                e.target.value = "";
              }}
            />
          </div>

          {erroImport && (
            <p style={{ color: "crimson" }}>{erroImport}</p>
          )}

          <details>
            <summary>Campos esperados ({CAMPOS_VEICULO.length})</summary>
            <ul
              style={{
                columns: 2,
                columnGap: 24,
                fontSize: 12,
                maxHeight: 240,
                overflow: "auto",
              }}
            >
              {CAMPOS_VEICULO.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </details>
        </section>
      )}
    </div>
  );
}