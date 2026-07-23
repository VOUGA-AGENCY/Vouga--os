-- SYNTHETIC RELATIONS DEVELOPMENT DATASET — manual only, never auto-run.
begin;
do $relations$
declare owner_id uuid;
begin
  select id into owner_id from public.members where is_active=true order by id limit 1;
  if owner_id is null then raise exception 'Relations dataset requires one active Member'; end if;
  if exists(select 1 from public.contacts where id::text like 'f011%') then raise exception 'Run Relations cleanup first'; end if;
  insert into public.contacts(id,display_name,company_id,owner_member_id,relationship_role,job_title,email,linkedin_url,important_context,strategic_at)
  values
  ('f0110001-0000-4000-8000-000000000001','Marta Correia','f0040001-0000-4000-8000-000000000001',owner_id,'investor','Partner','marta@example.invalid','https://www.linkedin.com/in/synthetic-marta','Interesse em operações B2B com ciclos de decisão curtos.',now()-interval '4 days'),
  ('f0110001-0000-4000-8000-000000000002','Tomás Neves','f0040001-0000-4000-8000-000000000002',owner_id,'prospect','COO','tomas@example.invalid',null,'Contacto inicial através de recomendação.',null),
  ('f0110001-0000-4000-8000-000000000003','Leonor Reis',null,owner_id,'advisor','Advisor independente',null,'https://www.linkedin.com/in/synthetic-leonor','Conhecimento relevante em desenho organizacional.',now()-interval '20 days');
  insert into public.contact_message_templates(id,name,channel,body,created_by_member_id) values
  ('f0110002-0000-4000-8000-000000000001','Introdução curta','linkedin','Olá — estou a trabalhar numa abordagem operacional que pode ser relevante para o teu contexto. Faz sentido falarmos 20 minutos?',owner_id),
  ('f0110002-0000-4000-8000-000000000002','Follow-up depois de conversa','email','Obrigado pela conversa. Deixo abaixo o ponto central e o próximo passo que combinámos.',owner_id);
  insert into public.contact_interactions(id,contact_id,direction,channel,body,occurred_at,source_template_id,recorded_by_member_id) values
  ('f0110003-0000-4000-8000-000000000001','f0110001-0000-4000-8000-000000000001','outbound','linkedin','Olá — estou a trabalhar numa abordagem operacional que pode ser relevante para o teu contexto. Faz sentido falarmos 20 minutos?',now()-interval '8 days','f0110002-0000-4000-8000-000000000001',owner_id),
  ('f0110003-0000-4000-8000-000000000003','f0110001-0000-4000-8000-000000000002','outbound','email','Envio uma introdução curta à Vouga e ao problema que estamos a resolver.',now()-interval '2 days',null,owner_id);
  insert into public.contact_interactions(id,contact_id,direction,channel,body,occurred_at,reply_to_interaction_id,recorded_by_member_id) values
  ('f0110003-0000-4000-8000-000000000002','f0110001-0000-4000-8000-000000000001','inbound','linkedin','Sim, vamos marcar. Tenho disponibilidade na próxima semana.',now()-interval '7 days','f0110003-0000-4000-8000-000000000001',owner_id);
  insert into public.meeting_participants(meeting_id,contact_id,external_name)
  select 'f0040002-0000-4000-8000-000000000001','f0110001-0000-4000-8000-000000000001','Marta Correia'
  where exists(select 1 from public.meetings where id='f0040002-0000-4000-8000-000000000001');
end $relations$;
commit;
