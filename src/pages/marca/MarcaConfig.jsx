import React, { useState, useEffect } from "react";
import { T, PLANO_CFG } from "../../lib/theme";
import { Chip, Modal, FormRow, Lbl, SectionHeader, Toggle } from "../../components/UI";
import { useToast } from "../../context/ToastContext";
import { useSupabaseQuery } from "../../lib/hooks";
import { updateRecord } from "../../lib/api";
import { PLANOS } from "../../utils/helpers";
import TagsManager from "./TagsManager";
import { requestNotificationPermission, sendLocalPushMock } from "../../lib/push";

function MarcaConfig({ user }) {
  const toast = useToast();
  const [tab, setTab] = useState("dados");
  const [intervaloContato, setIntervaloContato] = useState(48);
  const marcaId = user?.marca_id || user?.marcaId;
  const { data: marcasData, loading: loadingMarca } = useSupabaseQuery("marcas");
  const marca = marcasData?.find((m) => String(m.id) === String(marcaId)) || marcasData?.[0] || null;

  const [f, setF] = useState({ nome: "", segmento: "", email: "", telefone: "" });
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState({ type: "", msg: "" });

  useEffect(() => {
    if (marca) {
      setF({ nome: marca.nome || "", segmento: marca.segmento || "", email: marca.email || "", telefone: marca.telefone || "" });
    }
  }, [marca]);

  const handleSave = async () => {
    setSaving(true);
    setFeedback({ type: "", msg: "" });
    try {
      await updateRecord("marcas", marca.id, { nome: f.nome, segmento: f.segmento, email: f.email, telefone: f.telefone });
      setFeedback({ type: "success", msg: "Alterações salvas com sucesso!" });
      toast("Configurações salvas!", "success");
    } catch (e) {
      setFeedback({ type: "error", msg: e.message || "Erro ao salvar alterações." });
      toast(e.message || "Erro ao salvar configurações", "error");
    }
    setSaving(false);
  };

  const plano = marca ? PLANOS.find((p) => p.id === marca.plano) : null;
  const planoSt = marca ? PLANO_CFG[marca.plano] : null;

  const [integs, setIntegs] = useState([
    { l: "Shopify", icon: "🛍", desc: "E-commerce sincronizado", on: true },
    { l: "WhatsApp API", icon: "💬", desc: "Automações ativas", on: true },
    { l: "ERP", icon: "📦", desc: "Não conectado", on: false },
    { l: "Google Ads", icon: "📢", desc: "Não configurado", on: false },
  ]);
  const [notifs, setNotifs] = useState([
    { l: "Email de novos pedidos", on: true },
    { l: "Alertas de churn", on: true },
    { l: "Relatório semanal", on: false },
  ]);

  const [pushEnabled, setPushEnabled] = useState(() => "Notification" in window && Notification.permission === "granted");

  const toggleWebPush = async () => {
    if ("Notification" in window) {
      if (Notification.permission === "default" || Notification.permission === "denied") {
        const perm = await requestNotificationPermission();
        setPushEnabled(perm === "granted");
        if (perm === "granted") toast("Notificações ativadas com sucesso!", "success");
        else toast("Permissão negada pelo navegador", "error");
      } else if (Notification.permission === "granted") {
        toast("Para desativar crm.minerbz.com.br, altere as configurações do navegador.", "success");
      }
    } else {
      toast("Notificações não suportadas neste navegador.", "error");
    }
  };

  const sf = (k, v) => setF((x) => ({ ...x, [k]: v }));

  return (
    <div className="fade-up">
      <SectionHeader tag="Configurações" title="Configurações da Marca" />
      <div className="seg" style={{ marginBottom: 24 }}>
        {[{ k: "dados", l: "Dados" }, { k: "tags", l: "Tags" }, { k: "contato", l: "Regras de Contato" }, { k: "integracoes", l: "Integrações" }, { k: "notificacoes", l: "Notificações" }].map((t) => (
          <button key={t.k} className={`seg-btn ${tab === t.k ? "on" : ""}`} onClick={() => setTab(t.k)}>{t.l}</button>
        ))}
      </div>

      {tab === "dados" && (
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 20 }}>
          <div className="ap-card" style={{ padding: 24 }}>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 18 }}>Dados da Marca</div>
            {loadingMarca ? <div style={{ padding: 20, textAlign: "center", color: T.muted }}>Carregando...</div> : (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div><Lbl>Nome da Marca</Lbl> <input className="ap-inp" value={f.nome} onChange={(e) => sf("nome", e.target.value)} /></div>
              <div><Lbl>Segmento</Lbl> <input className="ap-inp" value={f.segmento} onChange={(e) => sf("segmento", e.target.value)} /></div>
              <FormRow>
                <div><Lbl>Email</Lbl> <input className="ap-inp" type="email" value={f.email} onChange={(e) => sf("email", e.target.value)} /></div>
                <div><Lbl>Telefone</Lbl> <input className="ap-inp" value={f.telefone} onChange={(e) => sf("telefone", e.target.value)} /></div>
              </FormRow>
              {feedback.msg && (
                <div className="fade-in" style={{ background: feedback.type === "success" ? "#e9fbed" : "#ffe5e3", border: `1px solid ${feedback.type === "success" ? "rgba(40,205,65,.2)" : "rgba(255,59,48,.2)"}`, borderRadius: 10, padding: "10px 14px", fontSize: 13, color: feedback.type === "success" ? "#28cd41" : "#ff3b30", fontWeight: 500 }}>{feedback.msg}</div>
              )}
              <button className="ap-btn ap-btn-primary" style={{ width: "fit-content" }} onClick={handleSave} disabled={saving}>{saving ? "Salvando…" : "Salvar Alterações"}</button>
            </div>
            )}
          </div>
          <div className="ap-card" style={{ padding: 24 }}>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>Plano Atual</div>
            {plano && planoSt ? (
              <>
                <Chip label={plano.label} c={planoSt.c} bg={planoSt.bg} />
                <div className="num" style={{ fontSize: 28, fontWeight: 800, color: planoSt.c, margin: "10px 0" }}>R$ {plano.preco}/mês</div>
              </>
            ) : (
              <>
                <Chip label="—" c={T.muted} bg="rgba(0,0,0,0.05)" />
                <div className="num" style={{ fontSize: 28, fontWeight: 800, color: T.muted, margin: "10px 0" }}>—</div>
              </>
            )}
            <button className="ap-btn ap-btn-secondary" style={{ width: "100%" }}>Fazer Upgrade →</button>
          </div>
        </div>
      )}

      {tab === "tags" && <TagsManager marcaId={marcaId} />}

      {tab === "contato" && (
        <div className="ap-card" style={{ padding: 24 }}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>⏰ Regras de Contato (Anti-Spam)</div>
          <p style={{ fontSize: 13, color: T.muted, marginBottom: 16 }}>
            Configure o intervalo mínimo entre contatos com o mesmo cliente. Isso protege o cliente de ser contactado com muita frequência.
          </p>
          <div style={{ maxWidth: 400 }}>
            <Lbl>Intervalo mínimo entre contatos (horas)</Lbl>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 6 }}>
              <input
                className="ap-inp"
                type="number"
                min={1}
                max={720}
                value={intervaloContato}
                onChange={e => setIntervaloContato(Number(e.target.value))}
                style={{ width: 100, textAlign: "center" }}
              />
              <span style={{ fontSize: 13, color: T.sub }}>horas ({Math.round(intervaloContato / 24)} dias)</span>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
              {[24, 48, 72, 168].map(h => (
                <button
                  key={h}
                  className={`ap-btn ${intervaloContato === h ? "ap-btn-primary" : "ap-btn-secondary"} ap-btn-sm`}
                  onClick={() => setIntervaloContato(h)}
                >
                  {h}h ({Math.round(h / 24)}d)
                </button>
              ))}
            </div>
            <button
              className="ap-btn ap-btn-primary"
              style={{ marginTop: 20 }}
              onClick={() => toast("Regras de contato salvas!", "success")}
            >
              Salvar Regras
            </button>
          </div>
        </div>
      )}

      {tab === "integracoes" && (
        <div className="ap-card" style={{ padding: 24 }}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Integrações</div>
          {integs.map((it, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: i < integs.length - 1 ? "1px solid rgba(0,0,0,0.05)" : "none" }}>
              <span style={{ fontSize: 20 }}>{it.icon}</span>
              <div style={{ flex: 1 }}><div style={{ fontSize: 14, fontWeight: 600 }}>{it.l}</div><div style={{ fontSize: 12, color: T.muted }}>{it.desc}</div></div>
              <Toggle checked={it.on} onChange={() => setIntegs((a) => a.map((x, j) => (j === i ? { ...x, on: !x.on } : x)))} />
            </div>
          ))}
        </div>
      )}

      {tab === "notificacoes" && (
        <div className="ap-card" style={{ padding: 24 }}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Notificações</div>
          {notifs.map((n, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", borderBottom: i < notifs.length - 1 ? "1px solid rgba(0,0,0,0.05)" : "none" }}>
              <span style={{ fontSize: 14, fontWeight: 500 }}>{n.l}</span>
              <Toggle checked={n.on} onChange={() => setNotifs((a) => a.map((x, j) => (j === i ? { ...x, on: !x.on } : x)))} />
            </div>
          ))}
          
          <div className="divider" />
          
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Notificações Push (Navegador)</div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0" }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Notificações neste dispositivo</div>
              <div style={{ fontSize: 12, color: T.muted }}>Seja alertado sobre vendas e mensagens importantes</div>
            </div>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              {pushEnabled && (
                <button className="ap-btn ap-btn-secondary ap-btn-sm" onClick={() => sendLocalPushMock("CRM Miner", "O Web Push nativo está configurado e funcionando! 🎉")}>Testar Push</button>
              )}
              <Toggle checked={pushEnabled} onChange={toggleWebPush} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


export default MarcaConfig;
