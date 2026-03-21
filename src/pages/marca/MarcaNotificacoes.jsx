import React, { useState, useEffect } from "react";
import { T } from "../../lib/theme";
import { Chip, SectionHeader } from "../../components/UI";
import { fetchNotificacoes, markAllRead, markRead, deleteNotificacao, clearNotificacoes } from "../../lib/api";
import { timeAgo } from "../../utils/helpers";

function MarcaNotificacoes({ user }) {
  const [notifs, setNotifs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("todas");

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetchNotificacoes();
      setNotifs(res?.data || []);
    } catch {}
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const NOTIF_TIPO = {
    pedido: { icon: "🛍", c: "#28cd41", label: "Pedido" },
    sistema: { icon: "⚙", c: "#aeaeb2", label: "Sistema" },
    alerta: { icon: "⚠️", c: "#ff9500", label: "Alerta" },
    campanha: { icon: "📢", c: "#8e44ef", label: "Campanha" },
    equipe: { icon: "👥", c: "#007aff", label: "Equipe" },
  };

  const filtered = filter === "todas" ? notifs : filter === "nao_lidas" ? notifs.filter(n => !n.lida) : notifs.filter(n => n.tipo === filter);

  const handleMarkAll = async () => { await markAllRead(); setNotifs(n => n.map(x => ({...x, lida: true}))); };
  const handleClearAll = async () => { if (!confirm("Limpar todas as notificações?")) return; await clearNotificacoes(); setNotifs([]); };
  const handleMark = async (n) => { if (n.lida) return; await markRead(n.id); setNotifs(prev => prev.map(x => x.id === n.id ? {...x, lida: true} : x)); };
  const handleDelete = async (id) => { await deleteNotificacao(id); setNotifs(prev => prev.filter(x => x.id !== id)); };

  return (
    <div className="fade-up">
      <SectionHeader tag="Centro" title="Notificações" action={
        <div style={{display:"flex",gap:8}}>
          <button className="ap-btn ap-btn-secondary ap-btn-sm" onClick={handleMarkAll}>✓ Marcar todas como lidas</button>
          <button className="ap-btn ap-btn-danger ap-btn-sm" onClick={handleClearAll}>🗑 Limpar todas</button>
        </div>
      } />

      <div className="seg" style={{marginBottom:20}}>
        {[{k:"todas",l:"Todas"},{k:"nao_lidas",l:"Não lidas"},{k:"pedido",l:"🛍 Pedidos"},{k:"sistema",l:"⚙ Sistema"},{k:"alerta",l:"⚠️ Alertas"},{k:"campanha",l:"📢 Campanhas"}].map(f=>(
          <button key={f.k} className={`seg-btn ${filter===f.k?"on":""}`} onClick={()=>setFilter(f.k)}>{f.l}</button>
        ))}
      </div>

      {loading && <div style={{textAlign:"center",padding:40,color:T.muted}}>Carregando...</div>}

      {!loading && filtered.length === 0 && (
        <div style={{textAlign:"center",padding:60,color:T.muted}}>
          <div style={{fontSize:48,marginBottom:16}}>🎉</div>
          <div style={{fontSize:15,fontWeight:600}}>Nenhuma notificação</div>
          <div style={{fontSize:13,marginTop:4}}>Tudo tranquilo por aqui!</div>
        </div>
      )}

      {!loading && filtered.map(n => {
        const cfg = NOTIF_TIPO[n.tipo] || NOTIF_TIPO.sistema;
        return (
          <div key={n.id} className="ap-card" style={{padding:"16px 20px",marginBottom:10,display:"flex",alignItems:"flex-start",gap:14,opacity:n.lida?0.7:1,cursor:"pointer"}} onClick={()=>handleMark(n)}>
            <div style={{width:36,height:36,borderRadius:10,background:cfg.c+"18",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>{cfg.icon}</div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                <div style={{fontSize:14,fontWeight:n.lida?500:700}}>{n.titulo}</div>
                {!n.lida && <div style={{width:8,height:8,borderRadius:4,background:"#4545F5",flexShrink:0}}/>}
              </div>
              <div style={{fontSize:13,color:T.sub,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{n.mensagem}</div>
              <div style={{display:"flex",alignItems:"center",gap:12,marginTop:6}}>
                <Chip label={cfg.label} c={cfg.c} bg={cfg.c+"18"} />
                <span style={{fontSize:11,color:T.muted}}>{timeAgo(n.created_at)}</span>
              </div>
            </div>
            <button onClick={(e)=>{e.stopPropagation();handleDelete(n.id)}} style={{background:"none",border:"none",cursor:"pointer",fontSize:14,color:T.muted,padding:4,flexShrink:0}} title="Excluir">🗑</button>
          </div>
        );
      })}
    </div>
  );
}

export default MarcaNotificacoes;
