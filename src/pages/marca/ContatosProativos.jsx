import React, { useState, useEffect } from "react";
import { T } from "../../lib/theme";
import { Avatar, Chip, SectionHeader, ProgressBar } from "../../components/UI";
import { useToast } from "../../context/ToastContext";
import { useContatosProativos } from "../../hooks/useContatosProativos";
import AgendarContatoModal from "./AgendarContatoModal";
import { fetchData } from "../../lib/api";

const RFM_LABEL = { champion: "Campeão", loyal: "Fiel", potential: "Potencial", at_risk: "Em Risco", em_risco: "Em Risco", hibernating: "Inativo", new: "Novo" };

function ContatosProativos({ user }) {
  const marcaId = user?.marca_id || user?.marcaId || "demo";
  const { sugestoes, meta } = useContatosProativos(user, marcaId);
  const toast = useToast();
  const [pulados, setPulados] = useState([]);
  const [contatados, setContatados] = useState(0);
  const [showAgendar, setShowAgendar] = useState(null);

  const [clientes, setClientes] = useState([]);
  useEffect(() => {
    fetchData("clientes", { limit: 5000 }).then(r => setClientes(r.data || [])).catch(() => {});
  }, []);
  const visiveis = sugestoes.filter(s => !pulados.includes(s.cliente.id));
  const realizados = contatados;
  const pct = meta > 0 ? Math.min(100, Math.round((realizados / meta) * 100)) : 0;

  const handlePular = (clienteId) => {
    setPulados(prev => [...prev, clienteId]);
    toast("Cliente removido das sugestões de hoje", "info");
  };

  const handleContatar = (clienteId) => {
    setContatados(prev => prev + 1);
    setPulados(prev => [...prev, clienteId]);
    toast("Contato registrado! 📞", "success");
  };

  return (
    <div className="fade-up">
      <SectionHeader tag="PROATIVO" title="Sugestões do Dia" />

      {/* Progress bar */}
      <div className="ap-card" style={{ padding: "18px 22px", marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <div style={{ fontSize: 14, fontWeight: 700 }}>📊 Progresso de Contatos</div>
          <span style={{ fontSize: 13, color: T.sub }}>
            <strong style={{ color: pct >= 100 ? "#28cd41" : "#4545F5" }}>{realizados}</strong> de {meta} contatos realizados hoje
          </span>
        </div>
        <ProgressBar value={realizados} max={meta} height={10} />
        {pct >= 100 && <div style={{ fontSize: 12, color: "#28cd41", marginTop: 6 }}>🎉 Meta diária atingida! Excelente trabalho!</div>}
      </div>

      {visiveis.length === 0 && (
        <div className="ap-card" style={{ padding: 40, textAlign: "center", color: T.muted }}>
          ✅ Sem sugestões pendentes para hoje!
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 14 }}>
        {visiveis.map(({ cliente: cli, motivos, motivoPrincipal }) => (
          <div key={cli.id} className="ap-card" style={{ padding: "18px 22px", borderLeft: `4px solid ${motivoPrincipal.cor}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <Avatar nome={cli.nome} size={36} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{cli.nome}</div>
                <div style={{ fontSize: 11, color: T.muted }}>{cli.telefone} · {RFM_LABEL[cli.segmento_rfm] || cli.segmento_rfm}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div className="num" style={{ fontSize: 14, fontWeight: 700, color: "#4545F5" }}>R$ {(cli.receita_total || 0).toLocaleString("pt-BR")}</div>
                <div style={{ fontSize: 10, color: T.muted }}>{cli.total_pedidos || 0} pedidos</div>
              </div>
            </div>

            {/* Motivos */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
              {motivos.map((m, i) => (
                <Chip key={i} label={m.texto} c={m.cor} bg={m.bg} />
              ))}
            </div>

            {/* Último contato */}
            <div style={{ fontSize: 12, color: T.muted, marginBottom: 12 }}>
              Último contato: {cli.ultimo_contato ? new Date(cli.ultimo_contato).toLocaleDateString("pt-BR") : "Nunca"}
            </div>

            {/* Actions */}
            <div style={{ display: "flex", gap: 8 }}>
              <button className="ap-btn ap-btn-primary ap-btn-sm" style={{ fontSize: 12, flex: 1 }} onClick={() => handleContatar(cli.id)}>
                📞 Contatar Agora
              </button>
              <button className="ap-btn ap-btn-sm" style={{ fontSize: 12 }} onClick={() => setShowAgendar(cli.id)}>
                📅 Agendar
              </button>
              <button className="ap-btn ap-btn-sm" style={{ fontSize: 12, color: T.muted }} onClick={() => handlePular(cli.id)}>
                Pular
              </button>
            </div>
          </div>
        ))}
      </div>

      {showAgendar && (
        <AgendarContatoModal
          clientes={clientes}
          user={user}
          marcaId={marcaId}
          defaultClienteId={showAgendar}
          onSave={() => { setShowAgendar(null); toast("Contato agendado! 📅", "success"); }}
          onClose={() => setShowAgendar(null)}
        />
      )}
    </div>
  );
}

export default ContatosProativos;
