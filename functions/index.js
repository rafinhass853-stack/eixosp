const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

initializeApp();
const db = getFirestore();

const normalizar = (valor) => String(valor ?? "").trim().replace(/^0+(?=\d)/, "");

exports.validarMatricula = onCall(
  { maxInstances: 10, enforceAppCheck: false },
  async (request) => {
    const matricula = normalizar(request.data?.matricula);
    if (!/^\d{1,20}$/.test(matricula)) {
      throw new HttpsError("invalid-argument", "Informe uma matrícula numérica válida.");
    }

    // Não retorna o documento completo: apenas os campos mínimos para a tela de entrada.
    // A matrícula não comprova a identidade do solicitante.
    const snapshot = await db.collection("funcionarios")
      .where("Matricula", "==", matricula)
      .limit(1)
      .get();

    if (snapshot.empty) {
      throw new HttpsError("not-found", "Matrícula não encontrada.");
    }

    const funcionario = snapshot.docs[0].data();
    const status = String(funcionario.Status ?? "").trim().toLowerCase();
    const situacaoFolha = String(funcionario["Sit. Folha"] ?? "").trim().toLowerCase();
    const inativo = ["inativo", "desligado", "demitido", "cancelado"].includes(status)
      || ["inativo", "desligado", "demitido"].includes(situacaoFolha);

    if (inativo) {
      throw new HttpsError("not-found", "Matrícula não elegível para acesso.");
    }

    return {
      matricula,
      nome: String(funcionario.Nome ?? "").slice(0, 120),
      aviso: "Matrícula verificada; identidade não autenticada.",
      acessoAdministrativo: false
    };
  }
);
