import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Deposito {
  id: string;
  user_id: string;
  plataforma_id: string | null;
  plataforma_nome: string | null;
  nome_usuario: string;
  valor: number;
  pix: string | null;
  status: string;
  detalhes: string | null;
  created_at: string;
}

export const useDepositos = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["depositos", user?.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("depositos").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Deposito[];
    },
    enabled: !!user,
  });
};

export const useCreateDeposito = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (data: Omit<Deposito, "id" | "user_id" | "created_at">) => {
      const { data: result, error } = await (supabase as any)
        .from("depositos").insert({ ...data, user_id: user!.id }).select().single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["depositos"] }),
  });
};

export const useUpdateDeposito = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string; status?: string; detalhes?: string }) => {
      const { error } = await (supabase as any)
        .from("depositos").update(data).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["depositos"] }),
  });
};
