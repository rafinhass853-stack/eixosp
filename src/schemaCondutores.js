// src/schemaCondutores.js

/* ============================================================
   UTILITÁRIOS
============================================================ */
export function normalizarCPF(v) {
  return String(v ?? '').replace(/\D/g, '').slice(0, 11);
}

export function formatarCPF(v) {
  const d = normalizarCPF(v);
  if (d.length !== 11) return d;
  return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6,9)}-${d.slice(9)}`;
}

export function limparValor(v) {
  if (v == null) return '';
  if (v instanceof Date) {
    // dd/mm/aaaa
    const dd = String(v.getDate()).padStart(2, '0');
    const mm = String(v.getMonth() + 1).padStart(2, '0');
    const yy = v.getFullYear();
    return `${dd}/${mm}/${yy}`;
  }
  return String(v).trim();
}

export function parseData(v) {
  if (!v) return null;
  if (v instanceof Date) return isNaN(v) ? null : v;
  const s = String(v).trim();
  // dd/mm/aaaa
  let m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) {
    const d = new Date(+m[3], +m[2] - 1, +m[1]);
    return isNaN(d) ? null : d;
  }
  // aaaa-mm-dd
  m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) {
    const d = new Date(+m[1], +m[2] - 1, +m[3]);
    return isNaN(d) ? null : d;
  }
  const d = new Date(s);
  return isNaN(d) ? null : d;
}

/* ============================================================
   DEFINIÇÃO DOS CAMPOS
   Cada campo: { key, col, label, grupo, tipo? }
   - key: nome no Firestore
   - col: nome EXATO da coluna na planilha
   - label: rótulo exibido no formulário
   - grupo: agrupamento visual no Drawer
   - tipo: 'texto' | 'data' | 'numero' | 'select'
============================================================ */

const F = (key, col, label, grupo, tipo = 'texto') => ({ key, col, label, grupo, tipo });

export const CAMPOS = [
  // --- Identificação / Condutor ---
  F('placa', 'Placa', 'Placa', 'Identificação'),
  F('numeroFrota', 'Nº Frota', 'Nº Frota', 'Identificação'),
  F('status', 'Status', 'Status', 'Identificação', 'select'),
  F('modelo', 'Modelo', 'Modelo', 'Identificação'),
  F('versaoModelo', 'Versão', 'Versão do Modelo', 'Identificação'),
  F('modeloCompleto', 'Modelo Completo', 'Modelo Completo', 'Identificação'),
  F('cor', 'Cor', 'Cor', 'Identificação'),
  F('marca', 'Marca', 'Marca', 'Identificação'),
  F('hodometro', 'Hodometro', 'Hodômetro', 'Identificação', 'numero'),
  F('ultimoComentario', 'Último Comentário', 'Último Comentário', 'Identificação'),

  // --- Propriedade / Status Veículo ---
  F('propriedade', 'Propriedade', 'Propriedade', 'Propriedade'),
  F('statusVeiculo', 'Status Veículo', 'Status Veículo', 'Propriedade'),
  F('movimentadoEm', 'Movimentado em', 'Movimentado em', 'Propriedade', 'data'),
  F('diasCorridos', 'Dias Corridos', 'Dias Corridos', 'Propriedade', 'numero'),
  F('oficina', 'Oficina', 'Oficina', 'Propriedade'),

  // --- Condutor ---
  F('condutor', 'Condutor', 'Condutor', 'Condutor'),
  F('matricula', 'Matrícula', 'Matrícula', 'Condutor'),
  F('cpf', 'CPF', 'CPF', 'Condutor'),
  F('cargo', 'Cargo', 'Cargo', 'Condutor'),
  F('tipoVinculoCondutor', 'Tipo Vínculo Condutor', 'Tipo Vínculo', 'Condutor'),
  F('carroBeneficio', 'Carro Benefício', 'Carro Benefício', 'Condutor'),
  F('tipoCondutorVeiculo', 'Tipo Condutor Veículo', 'Tipo Condutor', 'Condutor'),
  F('dataEntregaCondutor', 'Data Entrega Condutor', 'Data Entrega', 'Condutor', 'data'),
  F('dataDevolucaoCondutor', 'Data Devolução Condutor', 'Data Devolução', 'Condutor', 'data'),

  // --- Veículo ---
  F('tipoVeiculo', 'Tipo Veículo', 'Tipo Veículo', 'Veículo'),
  F('tipoFrota', 'Tipo Frota', 'Tipo Frota', 'Veículo'),
  F('aplicacao', 'Aplicação', 'Aplicação', 'Veículo'),
  F('categoria', 'Categoria', 'Categoria', 'Veículo'),
  F('operacaoHorario', 'Operação Horário', 'Operação Horário', 'Veículo'),
  F('situacao', 'Situação', 'Situação', 'Veículo'),

  // --- Localização / Estrutura ---
  F('pais', 'Pais', 'País', 'Estrutura'),
  F('regiao', 'Região', 'Região', 'Estrutura'),
  F('subRegiao', 'Sub Região', 'Sub Região', 'Estrutura'),
  F('unidade', 'Unidade', 'Unidade', 'Estrutura'),
  F('baseGestao', 'Base Gestão', 'Base Gestão', 'Estrutura'),
  F('baseOperacional', 'Base Operacional', 'Base Operacional', 'Estrutura'),
  F('divisao', 'Divisão', 'Divisão', 'Estrutura'),
  F('vicePresidencia', 'Vice Presidência', 'Vice Presidência', 'Estrutura'),
  F('diretoria', 'Diretoria', 'Diretoria', 'Estrutura'),
  F('gerencia', 'Gerência', 'Gerência', 'Estrutura'),
  F('coordenacao', 'Coordenação', 'Coordenação', 'Estrutura'),
  F('supervisao', 'Supervisão', 'Supervisão', 'Estrutura'),
  F('centroCusto', 'Centro Custo', 'Centro Custo', 'Estrutura'),
  F('centroCustoDescricao', 'Centro Custo Descrição', 'Centro Custo Descrição', 'Estrutura'),
  F('ordemCusteio', 'Ordem Custeio', 'Ordem Custeio', 'Estrutura'),

  // --- Fabricação / Patrimônio ---
  F('anoFabricacao', 'Ano Fabricação', 'Ano Fabricação', 'Fabricação', 'numero'),
  F('anoModelo', 'Ano Modelo', 'Ano Modelo', 'Fabricação', 'numero'),
  F('idade', 'Idade', 'Idade', 'Fabricação', 'numero'),
  F('codigoPatrimonio', 'Código Patrimônio', 'Código Patrimônio', 'Fabricação'),
  F('itemContabil', 'Item Contábil', 'Item Contábil', 'Fabricação'),
  F('classeValor', 'Classe Valor', 'Classe Valor', 'Fabricação'),

  // --- Ficha Técnica ---
  F('codigoFipe', 'Código Fipe', 'Código FIPE', 'Ficha Técnica'),
  F('combustivel', 'Combustível', 'Combustível', 'Ficha Técnica'),
  F('motorizacao', 'Motorização', 'Motorização', 'Ficha Técnica'),
  F('chassi', 'Chassi', 'Chassi', 'Ficha Técnica'),
  F('numeroPortas', 'Nº Portas', 'Nº Portas', 'Ficha Técnica', 'numero'),
  F('renavam', 'Renavam', 'Renavam', 'Ficha Técnica'),
  F('ufEmplacamento', 'UF Emplacamento', 'UF Emplacamento', 'Ficha Técnica'),
  F('numeroMotor', 'Nº Motor', 'Nº Motor', 'Ficha Técnica'),
  F('qtdeEixos', 'Qtde Eixos', 'Qtde Eixos', 'Ficha Técnica', 'numero'),
  F('qtdePneus', 'Qtde Pneus', 'Qtde Pneus', 'Ficha Técnica', 'numero'),
  F('qtdeEstepe', 'Qtde Estepe', 'Qtde Estepe', 'Ficha Técnica', 'numero'),
  F('tara', 'Tara', 'Tara', 'Ficha Técnica'),
  F('lotacao', 'Lotação', 'Lotação', 'Ficha Técnica'),
  F('pesoBruto', 'Peso Bruto', 'Peso Bruto', 'Ficha Técnica'),
  F('cmt', 'CMT', 'CMT', 'Ficha Técnica'),
  F('cabineAuxiliar', 'Cabine Auxiliar', 'Cabine Auxiliar', 'Ficha Técnica'),
  F('carroceria', 'Carroceria', 'Carroceria', 'Ficha Técnica'),
  F('capacidadePalet', 'Capacidade Palet', 'Capacidade Palet', 'Ficha Técnica'),
  F('capacidadeTanque', 'Capacidade Tanque', 'Capacidade Tanque', 'Ficha Técnica'),
  F('usaArla', 'Usa Arla', 'Usa Arla', 'Ficha Técnica'),
  F('capacidadeTanqueArla', 'Capacidade Tanque Arla', 'Capacidade Tanque Arla', 'Ficha Técnica'),

  // --- Licenciamento / Seguro ---
  F('licenciamentoAnoExercicio', 'Licenciamento Ano Exercício (IPVA)', 'Lic. Ano Exercício', 'Licenciamento'),
  F('licenciamentoIsento', 'Licenciamento Isento (IPVA)', 'Lic. Isento', 'Licenciamento'),
  F('licenciamentoStatusPagamento', 'Licenciamento Status Pagamento (IPVA)', 'Lic. Status Pagto', 'Licenciamento'),
  F('licenciamentoDataVencto', 'Licencimento Data Vencto (IPVA)', 'Lic. Data Vencto', 'Licenciamento', 'data'),
  F('licenciamentoDataPagto', 'Licencimento Data Pagto (IPVA)', 'Lic. Data Pagto', 'Licenciamento', 'data'),
  F('licenciamentoValorIpva', 'Licenciamento Valor (IPVA)', 'Lic. Valor IPVA', 'Licenciamento', 'numero'),
  F('licenciamentoValor', 'Licenciamento Valor', 'Lic. Valor', 'Licenciamento', 'numero'),
  F('possuiDut', 'Possui DUT', 'Possui DUT', 'Licenciamento'),
  F('documentoDataLimite', 'Documento Data Limite (CRLV)', 'Doc. Data Limite', 'Licenciamento', 'data'),
  F('documentoAno', 'Documento Ano (CRLV)', 'Doc. Ano', 'Licenciamento'),
  F('documentoAnoArquivo', 'Documento Ano Arquivo (CRLV)', 'Doc. Ano Arquivo', 'Licenciamento'),
  F('seguroAno', 'Seguro Ano', 'Seguro Ano', 'Seguro'),
  F('seguroCorporativo', 'Seguro Corporativo', 'Seguro Corporativo', 'Seguro'),
  F('seguroInicioVigencia', 'Seguro Inicio Vigência', 'Seguro Início', 'Seguro', 'data'),
  F('seguroFimVigencia', 'Seguro Fim Vigência', 'Seguro Fim', 'Seguro', 'data'),
  F('seguroParcelamento', 'Seguro Parcelamento', 'Seguro Parcelamento', 'Seguro'),
  F('seguroParcelaVencida', 'Seguro Parcela Vencida', 'Seguro Parcela Vencida', 'Seguro'),

  // --- Rodízio / Air Bag / Zero KM ---
  F('isentoRodizioPlaca', 'Isento Rodízio Placa', 'Isento Rodízio', 'Outros'),
  F('isentoRodizioDataVencimento', 'Isento Rodízio Placa Data Vencimento', 'Rodízio Vencto', 'Outros', 'data'),
  F('airBag', 'Air Bag', 'Air Bag', 'Outros'),
  F('zeroKm', 'Zero KM', 'Zero KM', 'Outros'),
  F('hodometroCompra', 'Hodometro Compra/Implantação', 'Hodômetro Compra', 'Outros', 'numero'),

  // --- Rastreador ---
  F('elegivelRastreador', 'Elegível Rastreador', 'Elegível Rastreador', 'Rastreador'),
  F('possuiRastreador', 'Possui Rastreador', 'Possui Rastreador', 'Rastreador'),
  F('rastreadorNumeroModulo', 'Rastreador Nº Módulo', 'Rastreador Nº Módulo', 'Rastreador'),
  F('rastreadorValorMensal', 'Rastreador Valor Mensal', 'Rastreador Valor Mensal', 'Rastreador', 'numero'),
  F('rastreadorDataInstalacao', 'Rastreador Data Instalação', 'Rastreador Data Instalação', 'Rastreador', 'data'),
  F('rastreadorIdentificador', 'Rastreador Identificador', 'Rastreador Identificador', 'Rastreador'),
  F('rastreadorAcelerometro', 'Rastreador Acelerometro', 'Rastreador Acelerômetro', 'Rastreador'),
  F('rastreadorDataUltimaPosicao', 'Rastreador Data Última Posição', 'Rastreador Últ. Posição', 'Rastreador', 'data'),
  F('rastreadorUltimoHodometro', 'Rastreador Último Hodometro', 'Rastreador Últ. Hodômetro', 'Rastreador', 'numero'),
  F('rastreadorUltimoStatusIgnicao', 'Rastreador Último Status Ignição', 'Rastreador Últ. Ignição', 'Rastreador'),

  // --- GNV / Rack / TAG ---
  F('gnv', 'GNV', 'GNV', 'Acessórios'),
  F('gnvValidade', 'GNV Validade', 'GNV Validade', 'Acessórios', 'data'),
  F('rack', 'Rack', 'Rack', 'Acessórios'),
  F('tagPedagio', 'TAG Pedágio', 'TAG Pedágio', 'Acessórios'),

  // --- Locação ---
  F('locadora', 'Locadora', 'Locadora', 'Locação'),
  F('numeroContratoLocacaoPedido', 'Nº Contrato Locação (Pedido)', 'Nº Contrato (Pedido)', 'Locação'),
  F('numeroContratoLocacao', 'Nº Contrato Locação', 'Nº Contrato Locação', 'Locação'),
  F('numeroContratoInterno', 'Número Contrato Interno', 'Nº Contrato Interno', 'Locação'),
  F('dataIncorporacao', 'Data Incoporação', 'Data Incorporação', 'Locação', 'data'),
  F('cnpjUnidade', 'Cnpj Unidade', 'CNPJ Unidade', 'Locação'),
  F('dataAquisicao', 'Data Aquisição/Disponibilização', 'Data Aquisição', 'Locação', 'data'),
  F('dataPrevisaoDevolucao', 'Data Previsão Devolução', 'Previsão Devolução', 'Locação', 'data'),
  F('mesAnoPrevisaoDevolucao', 'Mês/Ano Previsão Devolução', 'Mês/Ano Previsão Devolução', 'Locação'),
  F('dataDevolucaoSemMulta', 'Data Devolução Sem Multa', 'Dev. Sem Multa', 'Locação', 'data'),
  F('dataDevolucaoCarencia', 'Data Devolução Carência', 'Dev. Carência', 'Locação', 'data'),
  F('dataDevolucaoLocadora', 'Data Devolução Locadora', 'Dev. Locadora', 'Locação', 'data'),
  F('dataDesativacaoSistema', 'Data Desativação Sistema', 'Data Desativação', 'Locação', 'data'),
  F('valorAquisicaoLocacao', 'Valor Aquisição/Locação', 'Valor Aquisição', 'Locação', 'numero'),
  F('franquiaKm', 'Franquia Km', 'Franquia Km', 'Locação', 'numero'),
  F('valorKmInferior', 'Valor Km Inferior', 'Valor Km Inferior', 'Locação', 'numero'),
  F('valorKmExcedente', 'Valor Km Excedente', 'Valor Km Excedente', 'Locação', 'numero'),
  F('valorFranquiaSeguro', 'Valor Franquia Seguro', 'Valor Franquia Seguro', 'Locação', 'numero'),
  F('valorBeneficioFuncao', 'Valor Benefício Função', 'Valor Benefício Função', 'Locação', 'numero'),
  F('taxaDepreciacaoAnual', 'Taxa Depreciação Anual', 'Taxa Depreciação', 'Locação', 'numero'),
  F('valorCalculadoDepreciacao', 'Valor Calculado Depreciação', 'Valor Calc. Depreciação', 'Locação', 'numero'),

  // --- Agregamento ---
  F('politicaFrotaTermo', 'Politica Frota/Termo', 'Política Frota/Termo', 'Agregamento'),
  F('planoAgregamento', 'Plano Agregamento', 'Plano Agregamento', 'Agregamento'),
  F('codigoFornecedorAgregamento', 'Código Fornecedor Agregamento', 'Cód. Fornecedor', 'Agregamento'),
  F('codigoBonificacaoAgregamento', 'Código Bonificação Agregamento', 'Cód. Bonificação', 'Agregamento'),
  F('carroEhDoAgregado', 'Carro é do Agregado', 'Carro é do Agregado', 'Agregamento'),
  F('carroAgregadoEmNomeDe', 'Carro Agregado em Nome de', 'Agregado em Nome de', 'Agregamento'),
  F('totalKmRodadoMesAtual', 'Total Km Rodado Mês Atual', 'Km Mês Atual', 'Agregamento', 'numero'),
  F('localRodagem', 'Local Rodagem', 'Local Rodagem', 'Agregamento'),

  // --- Checklist ---
  F('planoRecorrenciaChecklist', 'Plano Recorrência Checklist', 'Plano Recorrência Checklist', 'Checklist'),
  F('checklistPendencia', 'Checklist Pendência', 'Checklist Pendência', 'Checklist'),
  F('checklist', 'Checklist', 'Checklist', 'Checklist'),
  F('checklistTipo', 'Checklist Tipo', 'Checklist Tipo', 'Checklist'),
  F('checklistData', 'Checklist Data', 'Checklist Data', 'Checklist', 'data'),
  F('checklistEstado', 'Checklist Estado', 'Checklist Estado', 'Checklist'),
  F('checklistTemAvarias', 'Checklist Tem Avarias', 'Checklist Tem Avarias', 'Checklist'),
  F('checklistObservacao', 'Checklist Observação', 'Checklist Observação', 'Checklist'),

  // --- Manutenção ---
  F('planoManutencaoPreventiva', 'Plano Manutenção Preventiva', 'Plano Manutenção', 'Manutenção'),
  F('manutencaoPreventivaData', 'Manutenção Preventiva Data', 'Manutenção Data', 'Manutenção', 'data'),
  F('manutencaoPreventivaHodometro', 'Manutenção Preventiva Hodometro', 'Manutenção Hodômetro', 'Manutenção', 'numero'),
  F('planoRodizioPneus', 'Plano Rodizio Pneus', 'Plano Rodízio Pneus', 'Manutenção'),
  F('rodizioPneusData', 'Rodizio Pneus Data', 'Rodízio Pneus Data', 'Manutenção', 'data'),
  F('rodizioPneusHodometro', 'Rodizio Pneus Hodometro', 'Rodízio Pneus Hodômetro', 'Manutenção', 'numero'),

  // --- Abastecimento ---
  F('ultimaDataAbastecimento', 'Última Data Abastecimento', 'Últ. Abastecimento', 'Abastecimento', 'data'),
  F('municipioUltimoAbastecimento', 'Município Último Abastecimento', 'Município Últ. Abast.', 'Abastecimento'),
  F('matriculaUltimoAbastecimento', 'Matrícula Último Abastecimento', 'Matrícula Últ. Abast.', 'Abastecimento'),
  F('condutorUltimoAbastecimento', 'Condutor Último Abastecimento', 'Condutor Últ. Abast.', 'Abastecimento'),
  F('hodometroUltimoAbastecimento', 'Hodometro Último Abastecimento', 'Hodômetro Últ. Abast.', 'Abastecimento', 'numero'),

  // --- Auditoria / Sistema ---
  F('placaAnterior', 'Placa Anterior', 'Placa Anterior', 'Sistema'),
  F('registroCriadoEm', 'Registro criado em', 'Registro Criado', 'Sistema', 'data'),
  F('atualizadoEm', 'Atualizado em', 'Atualizado em', 'Sistema', 'data'),
  F('por', 'Por', 'Por', 'Sistema'),
  F('empresaProprietaria', 'Empresa Proprietária', 'Empresa Proprietária', 'Sistema'),
  F('empresaAlocada', 'Empresa Alocada', 'Empresa Alocada', 'Sistema'),

  // --- Ficha Técnica (cont.) ---
  F('consultaFichaTecnica', 'Consulta Ficha Técnica', 'Consulta Ficha Técnica', 'Ficha Técnica'),
  F('temCatalogoPecas', 'Tem Catalogo Peças', 'Tem Catálogo Peças', 'Ficha Técnica'),
  F('qtdEquipamentosVinculados', 'Qtd Equipamentos Vinculados', 'Qtd Equipamentos', 'Ficha Técnica', 'numero'),
  F('aterramento', 'Aterramento', 'Aterramento', 'Ficha Técnica'),
  F('duplaIsolacao', 'Dupla Isolação', 'Dupla Isolação', 'Ficha Técnica'),

  // --- Garantia / Tacógrafo / Fumaça ---
  F('garantiaVeiculoMeses', 'Garantia Veículo Em Meses', 'Garantia (meses)', 'Garantia', 'numero'),
  F('tacografo', 'Tacografo', 'Tacógrafo', 'Garantia'),
  F('tacografoTipo', 'Tacografo Tipo', 'Tacógrafo Tipo', 'Garantia'),
  F('tacografoNumeroCertificado', 'Tacografo Número Certificado', 'Tacógrafo Nº Certificado', 'Garantia'),
  F('tacografoDataValidade', 'Tacografo Data Validade', 'Tacógrafo Validade', 'Garantia', 'data'),
  F('fumacaPretaDataInspecao', 'Fumaça Preta Data Inspeção', 'Fumaça Preta Inspeção', 'Garantia', 'data'),
  F('fumacaPretaDataLimite', 'Fumaça Preta Data Limite', 'Fumaça Preta Limite', 'Garantia', 'data'),

  // --- Blindagem ---
  F('nivelBlindagem', 'Nível Blindagem', 'Nível Blindagem', 'Blindagem'),
  F('blindagemDataInstalacao', 'Blindagem Data Instalação', 'Blindagem Instalação', 'Blindagem', 'data'),
  F('blindagemGarantiaMeses', 'Blindagem Garantia em Meses', 'Blindagem Garantia (meses)', 'Blindagem', 'numero'),
  F('blindagemDataFinalGarantia', 'Blindagem Data Final Garantia', 'Blindagem Final Garantia', 'Blindagem', 'data'),
  F('valorBlindagem', 'Valor Blindagem', 'Valor Blindagem', 'Blindagem', 'numero'),
  F('valorBlindagemAcessorio', 'Valor Blindagem Acessório', 'Valor Blindagem Acessório', 'Blindagem', 'numero'),
  F('valorCalculadoDepreciacaoBlindagem', 'Valor Calculado Depreciação Blindagem', 'Valor Calc. Depreciação Blindagem', 'Blindagem', 'numero'),

  // --- Outros ---
  F('plotagem', 'Plotagem', 'Plotagem', 'Outros'),
  F('nfe', 'NFe', 'NFe', 'Outros'),
  F('cte', 'CTe', 'CTe', 'Outros'),
  F('responsavelImediato', 'Responsável Imediato', 'Responsável Imediato', 'Outros'),
  F('responsavel2Nivel', 'Responsável 2º Nível', 'Responsável 2º Nível', 'Outros'),
  F('responsavel3Nivel', 'Responsável 3º Nível', 'Responsável 3º Nível', 'Outros'),
  F('responsavel4Nivel', 'Responsável 4º Nível', 'Responsável 4º Nível', 'Outros'),
  F('responsavel5Nivel', 'Responsável 5º Nível', 'Responsável 5º Nível', 'Outros'),
  F('responsavel6Nivel', 'Responsável 6º Nível', 'Responsável 6º Nível', 'Outros'),
  F('medirEficiencia', 'Medir Eficiência', 'Medir Eficiência', 'Outros'),
  F('tipoPlaca', 'Tipo Placa', 'Tipo Placa', 'Outros'),
  F('idTicket', 'Id Ticket', 'Id Ticket', 'Outros'),
];

/* ============================================================
   CAMPOS DO FORMULÁRIO (subset editável manualmente)
   Evitamos expor campos de auditoria/sistema e dados redundantes
============================================================ */
export const CAMPOS_FORM = [
  'placa', 'numeroFrota', 'status', 'modelo', 'versaoModelo', 'modeloCompleto',
  'cor', 'marca', 'hodometro', 'condutor', 'matricula', 'cpf', 'cargo',
  'tipoVinculoCondutor', 'carroBeneficio', 'tipoCondutorVeiculo',
  'dataEntregaCondutor', 'dataDevolucaoCondutor',
  'tipoVeiculo', 'tipoFrota', 'aplicacao', 'categoria', 'operacaoHorario', 'situacao',
  'pais', 'regiao', 'subRegiao', 'unidade', 'baseGestao', 'baseOperacional',
  'divisao', 'vicePresidencia', 'diretoria', 'gerencia', 'coordenacao', 'supervisao',
  'centroCusto', 'centroCustoDescricao',
  'chassi', 'renavam', 'ufEmplacamento', 'combustivel', 'motorizacao',
  'anoFabricacao', 'anoModelo',
];

/* ============================================================
   AGRUPAMENTO PARA O DRAWER
============================================================ */
const ORDEM_GRUPOS = [
  'Identificação', 'Condutor', 'Veículo', 'Estrutura', 'Propriedade',
  'Fabricação', 'Ficha Técnica', 'Licenciamento', 'Seguro', 'Rastreador',
  'Acessórios', 'Locação', 'Agregamento', 'Checklist', 'Manutenção',
  'Abastecimento', 'Garantia', 'Blindagem', 'Outros', 'Sistema',
];

export const GRUPOS_CAMPOS = ORDEM_GRUPOS.map((titulo) => ({
  titulo,
  campos: CAMPOS.filter((c) => c.grupo === titulo).map((c) => c.key),
}));

/* ============================================================
   HELPERS DE LABEL
============================================================ */
const LABEL_MAP = CAMPOS.reduce((acc, c) => {
  acc[c.key] = c.label;
  return acc;
}, {});

export function labelDe(key) {
  return LABEL_MAP[key] || key;
}