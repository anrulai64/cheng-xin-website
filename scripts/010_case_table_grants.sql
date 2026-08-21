-- STEP 14D: Persist the minimum table-level privileges required by the Case Study CMS.
-- RLS policies remain authoritative for public visibility and admin write access.

grant select on table
  public.case_categories,
  public.case_items,
  public.case_images,
  public.case_related_cases,
  public.case_intro_content
to anon, authenticated;

grant insert, update, delete on table
  public.case_categories,
  public.case_items,
  public.case_images,
  public.case_related_cases,
  public.case_intro_content
to authenticated;
