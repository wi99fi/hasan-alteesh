<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Use the shared `ClinicApp` shell and protected `_authenticated` routes for clinic modules, because navigation, branding, and access behavior must stay consistent.
- Keep clinic data in Lovable Cloud with row-level policies and roles in `user_roles`, because medical and financial records require server-enforced authorization.
- Treat patient deletion as archival through `is_active`, while staff account deletion uses an authenticated server function, because clinical history must remain intact.
- Read the public clinic profile only through the narrow `get_public_clinic_settings` RPC, because visitor pages must never expose operational records.
