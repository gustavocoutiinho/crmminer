import React, { useState, useMemo } from "react";
import { T } from "../../lib/theme";
import { Avatar, Chip, SectionHeader } from "../../components/UI";
import { useToast } from "../../context/ToastContext";
import AgendarContatoModal from "./AgendarContatoModal";

const TIPO_ICON = { whatsapp: "💬", ligacao: "📞", email: "📧" };
const TIPO_LABEL = { whatsapp: "WhatsApp", ligacao: "Ligação", email: "Email" };
const FILTROS = [
  { key: "hoje", label: "Hoje" },
  { key: "semana", label: "Esta Semana" },
  { key: "mes", label: "Este Mês" },
  { key: "atrasados", label: "Atrasados" },
];

function AgendaContatos({ user }) {
  const marcaId = user?.marca_id || user?.marcaId || "demo";
  const [agendados, setAgendados] = useState(() =>
    [].filter(a => a.marca_id === marcaId)
  );
  const [filtro, setFiltro] = useState("mes");
  const [selectedDay, setSelectedDay] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [reagendarItem, setReagendarItem] = useState(null);
  const toast = useToast();

  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const year = today.getFullYear();
  const month = today.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();

  const clientes = [];
  const clienteMap = {};
  clientes.forEach(c => { clienteMap[c.id] = c; });

  // Auto-mark overdue
  const processedAgendados = useMemo(() => {
    return agendados.map(a => {
      if (a.status === "pendente" && a.data < todayStr) {
        return { ...a, status: "atrasado" };
      }
      return a;
    });
  }, [agendados, todayStr]);

  const filtered = useMemo(() => {
    const now = new Date();
    const weekEnd = new Date(now);
    weekEnd.setDate(weekEnd.getDate() + (7 - weekEnd.getDay()));
    const weekEndStr = weekEnd.toISOString().slice(0, 10);
    const monthStr = todayStr.slice(0, 7);

    return processedAgendados.filter(a => {
      if (filtro === "hoje") return a.data === todayStr;
      if (filtro === "semana") return a.data >= todayStr && a.data <= weekEndStr;
      if (filtro === "mes") return a.data.startsWith(monthStr);
      if (filtro === "atrasados") return a.status === "atrasado";
      return true;
    });
  }, [processedAgendados, filtro, todayStr]);

  // Count per day for calendar
  const countPerDay = {};
  processedAgendados.forEach(a => {
    if (a.data.startsWith(`${year}-${String(month + 1).padStart(2, "0")}`)) {
      countPerDay[a.data] = (countPerDay[a.data] || 0) + 1;
    }
  });

  const atrasadosPerDay = {};
  processedAgendados.filter(a => a.status === "atrasado").forEach(a => {
    atrasadosPerDay[a.data] = true;
  });

  const dayItems = selectedDay
    ? processedAgendados.filter(a => a.data === selectedDay)
    : filtered;

  const handleMarcarRealizado = (item) => {
    setAgendados(prev => prev.map(a => a.id === item.id ? { ...a, status: "realizado" } : a));
    toast("Contato marcado como realizado! ✅", "success");
  };

  const handleReagendar = (item) => {
    setReagendarItem(item);
    setShowModal(true);
  };

  const handleSaveAgendamento = (novoItem) => {
    if (reagendarItem) {
      setAgendados(prev => prev.map(a => a.id === reagendarItem.id ? { ...a, status: "reagendado" } : a).concat(novoItem));
      setReagendarItem(null);
    } else {
      setAgendados(prev => [...prev, novoItem]);
    }
    setShowModal(false);
    toast("Contato agendado com sucesso! 📅", "success");
  };

  const calendarDays = [];
  for (let i = 0; i < firstDayOfWeek; i++) calendarDays.push(null);
  for (let d = 1; d <= daysInMonth; d++) calendarDays.push(d);

  const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

  return (
    <div className="fade-up">
      <SectionHeader tag="AGENDA" title="Contatos Agendados" />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div className="seg" style={{ display: "flex", gap: 4, background: "rgba(0,0,0,0.04)", borderRadius: 10, padding: 4 }}>
          {FILTROS.map(f => (
            <button key={f.key} className={`seg-btn ${filtro === f.key ? "on" : ""}`} onClick={() => { setFiltro(f.key); setSelectedDay(null); }}>
              {f.label}
              {f.key === "atrasados" && processedAgendados.filter(a => a.status === "atrasado").length > 0 && (
                <span style={{ marginLeft: 4, background: "#ff3b30", color: "#fff", borderRadius: 10, padding: "1px 6px", fontSize: 10, fontWeight: 700 }}>
                  {processedAgendados.filter(a => a.status === "atrasado").length}
                </span>
              )}
            </button>
          ))}
        </div>
        <button className="ap-btn ap-btn-primary ap-btn-sm" onClick={() => { setReagendarItem(null); setShowModal(true); }}>+ Agendar Contato</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: 20 }}>
        {/* Calendar */}
        <div className="ap-card" style={{ padding: "20px 22px" }}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, textAlign: "center" }}>
            📅 {monthNames[month]} {year}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, textAlign: "center" }}>
            {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map(d => (
              <div key={d} style={{ fontSize: 10, color: T.muted, fontWeight: 700, padding: 4 }}>{d}</div>
            ))}
            {calendarDays.map((day, i) => {
              if (!day) return <div key={`e-${i}`} />;
              const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              const count = countPerDay[dateStr] || 0;
              const isToday = dateStr === todayStr;
              const isSelected = dateStr === selectedDay;
              const hasAtrasado = atrasadosPerDay[dateStr];
              return (
                <div key={day} onClick={() => setSelectedDay(isSelected ? null : dateStr)}
                  style={{
                    padding: "6px 2px", borderRadius: 10, cursor: "pointer", position: "relative",
                    background: isSelected ? "#4545F5" : isToday ? "rgba(69,69,245,0.1)" : "transparent",
                    color: isSelected ? "#fff" : "inherit",
                    fontWeight: isToday ? 700 : 400, fontSize: 13,
                    transition: "all 0.15s",
                  }}>
                  {day}
                  {count > 0 && (
                    <span style={{
                      position: "absolute", top: 1, right: 1,
                      background: hasAtrasado ? "#ff3b30" : "#4545F5",
                      color: "#fff", borderRadius: 8, fontSize: 9, fontWeight: 700,
                      minWidth: 14, height: 14, display: "flex", alignItems: "center", justifyContent: "center",
                      padding: "0 3px",
                    }}>{count}</span>
                  )}
                </div>
              );
            })}
          </div>
          {selectedDay && (
            <div style={{ marginTop: 12, textAlign: "center" }}>
              <button onClick={() => setSelectedDay(null)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "#4545F5", fontWeight: 600 }}>
                Limpar seleção
              </button>
            </div>
          )}
        </div>

        {/* List */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {dayItems.length === 0 && (
            <div className="ap-card" style={{ padding: 32, textAlign: "center", color: T.muted }}>
              Nenhum contato agendado {selectedDay ? "neste dia" : "neste período"}
            </div>
          )}
          {dayItems.map(item => {
            const cli = clienteMap[item.cliente_id];
            const isAtrasado = item.status === "atrasado";
            const isRealizado = item.status === "realizado";
            return (
              <div key={item.id} className="ap-card" style={{
                padding: "16px 20px",
                borderLeft: `4px solid ${isAtrasado ? "#ff3b30" : isRealizado ? "#28cd41" : "#4545F5"}`,
                opacity: isRealizado ? 0.6 : 1,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <Avatar nome={cli?.nome || "?"} size={32} />
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700 }}>{cli?.nome || "Cliente"}</div>
                      <div style={{ fontSize: 12, color: T.muted }}>{item.data} às {item.hora}</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <Chip label={`${TIPO_ICON[item.tipo]} ${TIPO_LABEL[item.tipo]}`}
                      c={item.tipo === "whatsapp" ? "#28cd41" : item.tipo === "ligacao" ? "#4545F5" : "#ff9500"}
                      bg={item.tipo === "whatsapp" ? "#e9fbed" : item.tipo === "ligacao" ? "#eeeeff" : "#fff3e0"} />
                    {isAtrasado && <Chip label="Atrasado" c="#ff3b30" bg="#ffe5e3" />}
                    {isRealizado && <Chip label="Realizado" c="#28cd41" bg="#e9fbed" />}
                  </div>
                </div>
                {item.observacao && <div style={{ fontSize: 13, color: T.sub, marginBottom: 10 }}>{item.observacao}</div>}
                {!isRealizado && item.status !== "reagendado" && (
                  <div style={{ display: "flex", gap: 8 }}>
                    <button className="ap-btn ap-btn-primary ap-btn-sm" onClick={() => handleMarcarRealizado(item)} style={{ fontSize: 12 }}>✅ Marcar Realizado</button>
                    <button className="ap-btn ap-btn-sm" onClick={() => handleReagendar(item)} style={{ fontSize: 12 }}>📅 Reagendar</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {showModal && (
        <AgendarContatoModal
          clientes={clientes}
          user={user}
          marcaId={marcaId}
          defaultClienteId={reagendarItem?.cliente_id}
          onSave={handleSaveAgendamento}
          onClose={() => { setShowModal(false); setReagendarItem(null); }}
        />
      )}
    </div>
  );
}

export default AgendaContatos;
