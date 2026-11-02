import { useEffect, useState } from "react";
import { httpsCallable } from "firebase/functions";
import { functions } from "./firebase";

const CHAVE_SESSAO = "eixo.matricula.sessao";
const DURACAO_SESSAO_MS = 180 * 24 * 60 * 60 * 1000;

function lerSessao() {
  try {
    const sessao = JSON.parse(localStorage.getItem(CHAVE_SESSAO) || "null");
    if (!sessao || !sessao.matricula || !sessao.expiraEm || sessao.expiraEm < Date.now()) {
      localStorage.removeItem(CHAVE_SESSAO);
      return null;
    }
    return sessao;
  } catch {
    localStorage.removeItem(CHAVE_SESSAO);
    return null;
  }
}

export default function AcessoMatricula({ children }) {
  const [sessao, setSessao] = useState(null);
  const [matricula, setMatricula] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [validando, setValidando] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    // Esta sessão persistente é apenas uma conveniência de interface,
    // nunca uma credencial de autorização para o Firestore.
    setSessao(lerSessao());
    setCarregando(false);
  }, []);

  async function entrar(event) {
    event.preventDefault();
    setErro("");
    const valor = matricula.trim();
    if (!/^\d{1,20}$/.test(valor)) {
      setErro("Digite uma matrícula numérica válida.");
      return;
    }

    setValidando(true);
    try {
      // A consulta ocorre no servidor; o cliente não lê a coleção de funcionários.
      const validar = httpsCallable(functions, "validarMatricula");
      const resposta = await validar({ matricula: valor });
      const dados = resposta.data;
      const novaSessao = {
        matricula: dados.matricula,
        nome: dados.nome || "",
        expiraEm: Date.now() + DURACAO_SESSAO_MS,
      };
      localStorage.setItem(CHAVE_SESSAO, JSON.stringify(novaSessao));
      setSessao(novaSessao);
    } catch (error) {
      console.error("Falha na validação da matrícula:", error);
      setErro(error?.code === "functions/not-found"
        ? "Matrícula não encontrada ou não elegível para acesso."
        : "Não foi possível validar a matrícula. Verifique a conexão ou tente novamente.");
    } finally {
      setValidando(false);
    }
  }

  function sair() {
    localStorage.removeItem(CHAVE_SESSAO);
    setSessao(null);
    setMatricula("");
  }

  if (carregando) {
    return <main className="access-screen"><section className="access-card"><p>Verificando sessão...</p></section></main>;
  }

  if (!sessao) {
    return (
      <main className="access-screen">
        <section className="access-card">
          <div className="access-brand">eixo<span>SP</span></div>
          <p className="access-eyebrow">PLATAFORMA OPERACIONAL</p>
          <h1>Acesso por matrícula</h1>
          <p className="access-description">Informe uma matrícula cadastrada na base de funcionários para continuar.</p>
          <form onSubmit={entrar}>
            <label htmlFor="matricula-acesso">Matrícula</label>
            <input id="matricula-acesso" inputMode="numeric" autoComplete="username" value={matricula} onChange={(e) => setMatricula(e.target.value)} maxLength={20} required disabled={validando} placeholder="Digite sua matrícula" />
            {erro && <p className="access-error" role="alert">{erro}</p>}
            <button type="submit" disabled={validando}>{validando ? "Validando..." : "Acessar sistema"}</button>
          </form>
          <p className="access-notice"><strong>Limitação de segurança:</strong> a matrícula identifica um cadastro, mas não comprova a identidade de quem a informa. Esta etapa não é autenticação forte e não concede privilégios administrativos.</p>
        </section>
      </main>
    );
  }

  return (
    <>
      <div className="access-session-bar">
        <span>Entrada por matrícula: <strong>{sessao.nome || sessao.matricula}</strong> ({sessao.matricula})</span>
        <span className="access-session-warning">Identidade não verificada</span>
        <button type="button" onClick={sair}>Sair</button>
      </div>
      {children}
    </>
  );
}
