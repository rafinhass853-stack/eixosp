const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore } = require("firebase-admin/firestore");

initializeApp();
const db = getFirestore();

exports.importVeiculos = require("./importVeiculos").importVeiculos;

const normalizar = (valor) => String(valor ?? "").trim();

exports.autenticarFuncionario = onCall(
  { region: "southamerica-east1", maxInstances: 10, enforceAppCheck: false },
  async (request) => {
    const matriculaInformada = normalizar(request.data?.matricula);
    const senha = normalizar(request.data?.senha);

    // A base utiliza matrículas com seis dígitos (ex.: 000001).
    const matricula = /^\d{1,6}$/.test(matriculaInformada)
      ? matriculaInformada.padStart(6, "0")
      : matriculaInformada;

    if (!/^\d{1,20}$/.test(matricula) || !senha) {
      throw new HttpsError("invalid-argument", "Informe matrícula e senha.");
    }

    // Regra solicitada pelo projeto: a senha padrão e permanente é a própria matrícula.
    if (senha !== matriculaInformada && senha !== matricula) {
      throw new HttpsError("permission-denied", "Matrícula ou senha inválida.");
    }

    // A coleção existente no projeto é "funcionarios" e o ID do documento é a matrícula.
    const snapshot = await db.collection("funcionarios").doc(matricula).get();
    if (!snapshot.exists) {
      throw new HttpsError("not-found", "Matrícula não encontrada.");
    }

    const funcionario = snapshot.data() || {};
    const status = normalizar(funcionario.Status).toLowerCase();
    const situacaoFolha = normalizar(funcionario["Sit. Folha"]).toLowerCase();
    const inativo = ["inativo", "desligado", "demitido", "cancelado"].includes(status)
      || ["inativo", "desligado", "demitido"].includes(situacaoFolha);

    if (status !== "ativo" || inativo) {
      throw new HttpsError("permission-denied", "Funcionário inativo ou sem autorização de acesso.");
    }

    const nome = normalizar(funcionario.Nome).slice(0, 120);
    const customToken = await getAuth().createCustomToken(`funcionario_${matricula}`, {
      matricula,
      nome,
    });

    return { customToken, matricula, nome };
  }
);
