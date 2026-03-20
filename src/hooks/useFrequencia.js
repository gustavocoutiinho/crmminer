import { useMemo } from "react";

/**
 * Motor anti-spam: calcula se o cliente está bloqueado para contato
 * baseado no intervalo mínimo configurado pela marca
 */
export function useFrequencia(cliente, configMarca) {
  return useMemo(() => {
    if (!cliente) return { bloqueado: false, horasRestantes: 0, podeContatar: true, msgBloqueio: "" };

    const intervaloHoras = configMarca?.intervalo_minimo_contato_horas || 48;
    const proximo = cliente.proximo_contato_permitido;

    if (!proximo) return { bloqueado: false, horasRestantes: 0, podeContatar: true, msgBloqueio: "" };

    const agora = new Date();
    const proximoDate = new Date(proximo);

    if (agora >= proximoDate) {
      return { bloqueado: false, horasRestantes: 0, podeContatar: true, msgBloqueio: "" };
    }

    const diffMs = proximoDate - agora;
    const horasRestantes = Math.ceil(diffMs / (1000 * 60 * 60));

    return {
      bloqueado: true,
      horasRestantes,
      podeContatar: false,
      msgBloqueio: `Aguarde ${horasRestantes}h para novo contato (intervalo mínimo: ${intervaloHoras}h)`,
    };
  }, [cliente, configMarca]);
}

/**
 * Calcula próximo contato permitido após registrar um contato
 */
export function calcularProximoContato(intervaloHoras = 48) {
  const agora = new Date();
  return new Date(agora.getTime() + intervaloHoras * 60 * 60 * 1000).toISOString();
}
