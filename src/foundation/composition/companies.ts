import "server-only";

import { cache } from "react";
import { CompanyService } from "@/application/companies/company-service";
import { SupabaseCompanyReadModel } from "@/persistence/companies/supabase-company-read-model";
import { SupabaseCompanyRepository } from "@/persistence/companies/supabase-company-repository";
import { SupabaseMemberDirectory } from "@/persistence/members/supabase-member-directory";
import { createClient } from "@/persistence/supabase/server";

export const createCompanyModule = cache(async () => {
  const supabase = await createClient();
  const members = new SupabaseMemberDirectory(supabase);

  return {
    service: new CompanyService(new SupabaseCompanyRepository(supabase), members),
    readModel: new SupabaseCompanyReadModel(supabase),
  };
});
