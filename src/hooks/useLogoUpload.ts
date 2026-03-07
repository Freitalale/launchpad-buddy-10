import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useLogoUpload = () => {
  const [uploading, setUploading] = useState(false);

  const uploadLogo = async (file: File, platformId: string): Promise<string> => {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${platformId}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("logos")
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("logos").getPublicUrl(path);
      return data.publicUrl;
    } finally {
      setUploading(false);
    }
  };

  return { uploadLogo, uploading };
};
