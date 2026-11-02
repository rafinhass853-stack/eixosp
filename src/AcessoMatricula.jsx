import { useEffect, useState } from "react";
import { onAuthStateChanged, signInWithCustomToken, signOut } from "firebase/auth";
import { httpsCallable } from "firebase/functions";
import { auth, functions } from "./firebase";

export default function AcessoMatricula({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [matricula, setMatricula] = useState("");
  const [senha, setSenha] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [validando, setValidando] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    const cancelar = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setUsuario(null);
        setCarregando(false);
        return;
      }
      try {
        const token = await user.getIdTokenResult();
        setUsuario({
          matricula: String(token.claims.matricula || user.uid.replace(/^funcionario_/, "")),
          nome: String(token.claims.nome || ""),
        });
      } catch (error) {
        console.error("Não foi possível carregar a sessão:", error);
        await signOut(auth);
        setUsuario(null);
      } finally {
        setCarregando(false);
      }
    });
    return cancelar;
  }, []);

  async function entrar(event) {
    event.preventDefault();
    setErro("");
    const valor = matricula.trim();
    const senhaInformada = senha.trim();

    if (!/^\d{1,20}$/.test(valor)) {
      setErro("Digite uma matrícula numérica válida.");
      return;
    }
    if (!senhaInformada) {
      setErro("Digite sua senha.");
      return;
    }

    setValidando(true);
    try {
      const autenticar = httpsCallable(functions, "autenticarFuncionario");
      const resposta = await autenticar({ matricula: valor, senha: senhaInformada });
      await signInWithCustomToken(auth, resposta.data.customToken);
      setMatricula("");
      setSenha("");
    } catch (error) {
      console.error("Falha no acesso ao EixoSP:", error);
      const codigo = String(error?.code || "");
      setErro(codigo.includes("not-found")
        ? "Matrícula não encontrada."
        : codigo.includes("permission-denied")
          ? "Matrícula ou senha inválida, ou funcionário inativo."
          : "Não foi possível validar o acesso. Verifique a conexão e tente novamente.");
    } finally {
      setValidando(false);
    }
  }

  async function sair() {
    await signOut(auth);
    setUsuario(null);
    setMatricula("");
    setSenha("");
  }

  if (carregando) {
    return <main className="access-screen"><section className="access-card"><p>Verificando sessão...</p></section></main>;
  }

  if (!usuario) {
    return (
      <main className="access-screen">
        <section className="access-card">
          <div className="access-brand">eixo<span>SP</span></div>
          <p className="access-eyebrow">PLATAFORMA OPERACIONAL</p>
          <h1>Acesso ao EixoSP</h1>
          <p className="access-description">Entre com sua matrícula. A senha padrão é a própria matrícula.</p>
          <form onSubmit={entrar}>
            <label htmlFor="matricula-acesso">Matrícula</label>
            <input id="matricula-acesso" inputMode="numeric" autoComplete="username" value={matricula} onChange={(e) => setMatricula(e.target.value)} maxLength={20} required disabled={validando} placeholder="Digite sua matrícula" />
            <label htmlFor="senha-acesso">Senha</label>
            <input id="senha-acesso" type="password" autoComplete="current-password" value={senha} onChange={(e) => setSenha(e.target.value)} maxLength={20} required disabled={validando} placeholder="Digite sua senha" />
            {erro && <p className="access-error" role="alert">{erro}</p>}
            <button type="submit" disabled={validando}>{validando ? "Validando..." : "Acessar sistema"}</button>
          </form>
          <p className="access-notice"><strong>Acesso interno:</strong> utilize sua matrícula nos dois campos. Apenas funcionários com status Ativo na coleção funcionarios podem entrar. Essa senha é compartilhada como padrão e não comprova a identidade individual do colaborador.</p>
        </section>
      </main>
    );
  }

  return (
    <>
      <div className="access-session-bar">
        <span>Conectado: <strong>{usuario.nome || usuario.matricula}</strong> ({usuario.matricula})</span>
        <span className="access-session-warning">Acesso por matrícula</span>
        <button type="button" onClick={sair}>Sair</button>
      </div>
      {children}
    </>
  );
}
