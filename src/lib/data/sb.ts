import { supabase } from "@/integrations/supabase/client";

// Acesso Supabase sem os tipos gerados pelo Lovable. É a fronteira do adapter:
// todo o mapeamento para a base de dados acontece nesta camada, para que as
// páginas dependam só dos tipos de domínio (./types).
export const sb = supabase as unknown as {
  from: (t: string) => any;
  storage: { from: (b: string) => any };
};
