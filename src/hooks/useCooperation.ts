import { useMemo } from "react";
import { type Plataforma } from "@/hooks/usePlatforms";

export interface CooperationInfo {
  active: boolean;
  expired: boolean;
  daysRemaining: number;
  expiresAt: Date | null;
  urgency: "normal" | "warning" | "critical" | "expired";
}

export const getCooperationInfo = (p: Plataforma): CooperationInfo => {
  if (p.cooperacao_dias === null || !p.cooperacao_expira) {
    return { active: false, expired: false, daysRemaining: 0, expiresAt: null, urgency: "normal" };
  }

  const expiry = new Date(p.cooperacao_expira + "T23:59:59");
  const now = new Date();
  const diffMs = expiry.getTime() - now.getTime();
  const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (daysRemaining <= 0) {
    return { active: false, expired: true, daysRemaining: 0, expiresAt: expiry, urgency: "expired" };
  }

  let urgency: CooperationInfo["urgency"] = "normal";
  if (daysRemaining <= 3) urgency = "critical";
  else if (daysRemaining <= 7) urgency = "warning";

  return { active: true, expired: false, daysRemaining, expiresAt: expiry, urgency };
};

export const useCooperationInfo = (platforms: Plataforma[]) => {
  return useMemo(() => {
    return platforms.map(p => ({
      platform: p,
      cooperation: getCooperationInfo(p),
    }));
  }, [platforms]);
};

export const useExpiringCooperations = (platforms: Plataforma[]) => {
  return useMemo(() => {
    return platforms
      .map(p => ({ platform: p, cooperation: getCooperationInfo(p) }))
      .filter(({ cooperation }) => cooperation.urgency === "critical" || cooperation.urgency === "warning" || cooperation.expired)
      .sort((a, b) => a.cooperation.daysRemaining - b.cooperation.daysRemaining);
  }, [platforms]);
};
