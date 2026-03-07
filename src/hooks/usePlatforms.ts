import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type Plataforma = Tables<"plataformas">;
export type PlataformaInsert = TablesInsert<"plataformas">;
export type PlataformaUpdate = TablesUpdate<"plataformas">;

export const usePlatforms = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["plataformas", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("plataformas")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Plataforma[];
    },
    enabled: !!user,
  });
};

export const useCreatePlatform = () => {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: Omit<PlataformaInsert, "user_id">) => {
      const { data: result, error } = await supabase
        .from("plataformas")
        .insert({ ...data, user_id: user!.id })
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["plataformas"] }),
  });
};

export const useUpdatePlatform = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: PlataformaUpdate & { id: string }) => {
      const { data: result, error } = await supabase
        .from("plataformas")
        .update(data)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["plataformas"] }),
  });
};

export const useDeletePlatform = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("plataformas").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["plataformas"] }),
  });
};
