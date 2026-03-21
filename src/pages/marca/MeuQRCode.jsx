import React, { useRef, useState, useEffect } from "react";
import { T } from "../../lib/theme";
import { SectionHeader } from "../../components/UI";
import { useToast } from "../../context/ToastContext";
import { DB_FALLBACK } from "../../data/fallback";

function MeuQRCode({ user }) {
  const toast = useToast();
  const canvasRef = useRef(null);
  const [imgLoaded, setImgLoaded] = useState(false);

  const vendedor = DB_FALLBACK.usuarios.find(u => u.id === user.id) || user;
  const marca = DB_FALLBACK.marcas.find(m => m.id === (user.marca_id || user.marcaId || "demo"));
  const codigo = vendedor.codigo_vendedor || `${(marca?.nome || "MARCA").replace(/\s/g, "").substring(0, 4).toUpperCase()}-${user.nome.split(" ")[0].toUpperCase()}-001`;
  const marcaDomain = marca?.email?.split("@")[1] || "minerbz.com.br";
  const link = `https://${marcaDomain}/?ref=${codigo}`;
  const qrStats = vendedor.qr_stats || { escaneados: 0, vendas: 0, receita: 0 };

  // QR via free API
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(link)}&size=300x300&margin=10`;

  // Draw QR on canvas for download
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      canvas.width = 400;
      canvas.height = 500;

      // Background
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, 400, 500);

      // QR
      ctx.drawImage(img, 50, 30, 300, 300);

      // Vendor name
      ctx.fillStyle = "#1d1d1f";
      ctx.font = "bold 20px Inter, system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(vendedor.nome, 200, 370);

      // Code
      ctx.fillStyle = "#4545F5";
      ctx.font = "bold 14px monospace";
      ctx.fillText(codigo, 200, 400);

      // Brand
      ctx.fillStyle = "#6e6e73";
      ctx.font = "12px Inter, system-ui, sans-serif";
      ctx.fillText(marca?.nome || "", 200, 430);

      // Link
      ctx.fillStyle = "#aeaeb2";
      ctx.font = "10px Inter, system-ui, sans-serif";
      ctx.fillText(link, 200, 460);

      setImgLoaded(true);
    };
    img.onerror = () => setImgLoaded(false);
    img.src = qrUrl;
  }, [qrUrl, vendedor.nome, codigo]);

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `qrcode-${codigo}.png`;
    a.click();
    toast("QR Code baixado! 📥", "success");
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(link).then(() => {
      toast("Link copiado! 📋", "success");
    }).catch(() => {
      toast("Erro ao copiar link", "error");
    });
  };

  return (
    <div className="fade-up">
      <SectionHeader tag="QR Code" title="Meu QR Code" />

      <div style={{ display: "flex", justifyContent: "center", marginTop: 16 }}>
        <div className="ap-card" style={{
          padding: "32px 40px",
          maxWidth: 420,
          textAlign: "center",
          backdropFilter: "blur(20px) saturate(1.8)",
          WebkitBackdropFilter: "blur(20px) saturate(1.8)",
        }}>
          {/* QR Image */}
          <div style={{
            background: "#fff",
            borderRadius: 16,
            padding: 20,
            display: "inline-block",
            boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
            marginBottom: 20,
          }}>
            <img
              src={qrUrl}
              alt="QR Code"
              style={{ width: 240, height: 240, display: "block" }}
              onError={(e) => { e.target.style.display = "none"; }}
            />
          </div>

          {/* Name & Code */}
          <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>{vendedor.nome}</div>
          <div style={{
            fontSize: 14, fontWeight: 700, color: "var(--brand, #4545F5)",
            fontFamily: "monospace", letterSpacing: 1,
            background: "var(--brand-light, rgba(69,69,245,0.08))",
            padding: "6px 16px", borderRadius: 8,
            display: "inline-block", marginBottom: 16,
          }}>
            {codigo}
          </div>

          <div style={{ fontSize: 12, color: "var(--muted, #aeaeb2)", marginBottom: 20, wordBreak: "break-all" }}>
            {link}
          </div>

          {/* Buttons */}
          <div style={{ display: "flex", gap: 10, justifyContent: "center", marginBottom: 24 }}>
            <button className="ap-btn ap-btn-primary" onClick={handleDownload}>
              📥 Baixar PNG
            </button>
            <button className="ap-btn ap-btn-secondary" onClick={handleCopy}>
              📋 Copiar Link
            </button>
          </div>

          {/* Stats */}
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12,
            padding: "16px 0", borderTop: "1px solid var(--border, rgba(0,0,0,0.08))",
          }}>
            <div>
              <div className="num" style={{ fontSize: 22, fontWeight: 800, color: "var(--brand, #4545F5)" }}>
                {qrStats.escaneados}
              </div>
              <div style={{ fontSize: 11, color: "var(--muted, #aeaeb2)" }}>Escaneamentos</div>
            </div>
            <div>
              <div className="num" style={{ fontSize: 22, fontWeight: 800, color: "#28cd41" }}>
                {qrStats.vendas}
              </div>
              <div style={{ fontSize: 11, color: "var(--muted, #aeaeb2)" }}>Vendas</div>
            </div>
            <div>
              <div className="num" style={{ fontSize: 22, fontWeight: 800, color: "#8e44ef" }}>
                R$ {Number(qrStats.receita).toLocaleString("pt-BR")}
              </div>
              <div style={{ fontSize: 11, color: "var(--muted, #aeaeb2)" }}>Receita</div>
            </div>
          </div>
        </div>
      </div>

      {/* Hidden canvas for download */}
      <canvas ref={canvasRef} style={{ display: "none" }} />
    </div>
  );
}

export default MeuQRCode;
