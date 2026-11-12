/* Cloud (Supabase Auth) identity layer -- added 2026-11-08.
 *
 * Design: the existing local username/password login (js/app.js's
 * login()) stays the ONLY thing that gates using the app at all,
 * including fully offline with no Supabase configured -- nothing here
 * can lock a user out of the local app. This layer additionally signs
 * the SAME person into a real Supabase Auth identity, using the SAME
 * password, purely so RLS (row level security) on the Supabase side can
 * actually tell who is asking instead of trusting any anon request
 * (see supabase/rls-fix-proposal/). A local account gains a cloud
 * identity by setting db.users[].cloudEmail once (via the forced
 * password-rotation step, or the "link to cloud" action in Settings);
 * until then it keeps working exactly as before, just without
 * authenticated sync.
 *
 * Company/role scoping is carried in the Supabase Auth user's own
 * app_metadata (company_ids: string[], role: string) -- settable only
 * via the Admin API (a service_role key), never by the signed-in user's
 * own client calls, so a user can never grant themselves access to a
 * company by signing up or changing their own password. See
 * supabase/rls-fix-proposal/provision-user.js for how an owner (using
 * their OWN service_role key, never this process's) assigns that.
 */
(function(W){
  function client(){ return window.supabaseClient || null; }
  function cloudAuthAvailable(){ return !!client(); }

  function redirectBase(){
    // Works unchanged on localhost during testing and on the real
    // GitHub Pages URL in production -- it's just "this page, with no
    // query/hash", so Supabase's own recovery query/hash params land
    // on top of it. The exact origin+path must also be present in the
    // Supabase project's Auth -> URL Configuration -> Redirect URLs
    // allow-list, or Supabase will refuse to honor it (see
    // fix-report-07's "email delivery & redirect config" section).
    return location.origin + location.pathname;
  }

  async function signInCloud(email, password){
    const sb = client();
    if(!sb || !email) return {ok:false, skipped:true};
    try{
      const {data, error} = await sb.auth.signInWithPassword({email, password});
      if(error) return {ok:false, error};
      return {ok:true, user:data.user};
    }catch(e){ return {ok:false, error:e}; }
  }

  async function signOutCloud(){
    const sb = client();
    if(!sb) return;
    try{ await sb.auth.signOut(); }catch(e){}
  }

  // Creates (or, if it already exists, simply authenticates) the cloud
  // identity for a local account, using the SAME password the person
  // just chose locally -- called once, from forcePasswordSetup / the
  // Settings "link to cloud" action. Never touches app_metadata (that
  // stays admin-only); a freshly linked account has no company access
  // until the owner provisions it (see provision-user.js) -- this only
  // creates the login identity itself.
  //
  // Cross-device sync bugfix (2026-11-12): the "already exists" fallback
  // described above was only ever a comment -- signUp() on an email that
  // already has a cloud identity just returns an error, and nothing ever
  // tried signing in instead. In practice this meant: if a device's local
  // password ever diverged from the cloud identity's real password (the
  // two are only ever kept in sync by syncCloudPassword(), which itself
  // silently no-ops if that device has no live cloud session at the
  // moment the local password changes -- e.g. it was offline), every
  // future login's signInCloud() would keep failing forever, with no
  // visible error and no way to recover short of resetting the cloud
  // password out-of-band. Re-running "link to cloud" in Settings with the
  // CURRENT local password now also repairs exactly this case: if signUp
  // reports the identity already exists, it retries as a normal sign-in
  // with the same (just-typed) password -- if that succeeds, the account
  // was already linked and working, just needed re-authenticating; if it
  // also fails, the real problem (a genuinely different password) is
  // returned instead of the confusing "already registered" message.
  async function linkAccountToCloud(email, password){
    const sb = client();
    if(!sb || !email) return {ok:false, skipped:true};
    try{
      const {data, error} = await sb.auth.signUp({email, password});
      if(error){
        if(/already registered|already been registered|user_already_exists/i.test(error.message||'')){
          const retry = await signInCloud(email, password);
          if(retry.ok) return {ok:true, user:retry.user, reauthenticated:true};
          // Cross-device link bugfix (2026-11-12): this email already has a
          // cloud identity, but the password just typed (THIS device's own
          // local app password -- the caller always tries that first, as a
          // convenience) doesn't match it. That's expected whenever a
          // second device's local password was set independently of the
          // first device's -- NOT a generic failure, and not something
          // retrying the same password will ever fix. Flagged separately so
          // the UI can offer the one thing that actually resolves it:
          // entering THAT cloud account's own (possibly different) password,
          // instead of silently repeating "linking failed" forever.
          return {ok:false, error: retry.error||error, emailTaken:true};
        }
        return {ok:false, error};
      }
      return {ok:true, user:data.user, needsEmailConfirm: !data.session};
    }catch(e){ return {ok:false, error:e}; }
  }

  // Keeps a cloud-linked account's password in sync after a LOCAL
  // password change (Settings page) -- signs in with the OLD password
  // first (the caller must do that before calling this, or pass it in)
  // isn't needed here: updateUser works on the current cloud session,
  // so this only does anything if that account is already signed in
  // to the cloud. If it isn't (e.g. this browser never linked, or the
  // cloud session expired), it's a silent no-op -- never blocks the
  // local password change.
  async function syncCloudPassword(email, newPassword){
    const sb = client();
    if(!sb) return {ok:false, skipped:true};
    try{
      const {data:sessionData} = await sb.auth.getSession();
      if(!sessionData || !sessionData.session) return {ok:false, skipped:true};
      const {error} = await sb.auth.updateUser({password:newPassword});
      if(error) return {ok:false, error};
      return {ok:true};
    }catch(e){ return {ok:false, error:e}; }
  }

  // Anti-enumeration by construction: Supabase's resetPasswordForEmail
  // returns the same generic success for a registered or unregistered
  // email (it only errors on things like malformed input or rate
  // limiting), so the caller never learns which case it was -- never
  // branch the UI message on whether this "succeeded" vs not for an
  // unknown-email reason.
  async function requestPasswordReset(email){
    const sb = client();
    if(!sb) return {ok:false, skipped:true};
    try{
      const {error} = await sb.auth.resetPasswordForEmail(email, {redirectTo: redirectBase()});
      if(error && error.status && error.status!==429) return {ok:false, error};
      return {ok:true};
    }catch(e){ return {ok:false, error:e}; }
  }

  // Supabase redirects back to redirectTo with either a `#access_token=
  // ...&type=recovery` hash (implicit flow) or a `?code=...` query
  // param (PKCE flow) depending on the project's Auth settings. Detect
  // either so the app can show the "set a new password" screen instead
  // of the normal login screen.
  function isRecoveryLink(){
    const hash = location.hash || '';
    const qs = location.search || '';
    return /type=recovery/.test(hash) || /[?&]code=/.test(qs);
  }

  async function completePasswordReset(newPassword){
    const sb = client();
    if(!sb) return {ok:false, skipped:true};
    try{
      const qs = new URLSearchParams(location.search);
      const code = qs.get('code');
      let viaFreshRecovery = false;
      if(code){
        // exchangeCodeForSession itself talks to the server, so a
        // bogus/tampered/reused code fails here with a real error --
        // this branch alone proves the link was genuine.
        const {error:exErr} = await sb.auth.exchangeCodeForSession(code);
        if(exErr) return {ok:false, error:exErr};
        viaFreshRecovery = true;
      }
      // Security fix (2026-11-08): for the implicit-flow hash format,
      // merely finding a session (getSession()) is NOT proof the link
      // in THIS URL was valid -- it would just as happily return an
      // unrelated, already-valid session sitting in this browser from
      // something else entirely, letting a garbage/expired/tampered
      // link "succeed" by accident. window._wpRecoveryConfirmed is only
      // ever set by the SDK's own PASSWORD_RECOVERY event, which it
      // fires only after validating the token's signature and expiry
      // against the server -- so require it here.
      if(!viaFreshRecovery && !window._wpRecoveryConfirmed){
        return {ok:false, error:{message:'no-recovery-session'}};
      }
      const {data:sessionData} = await sb.auth.getSession();
      if(!sessionData || !sessionData.session) return {ok:false, error:{message:'no-recovery-session'}};
      const email = sessionData.session.user && sessionData.session.user.email;
      const {error} = await sb.auth.updateUser({password:newPassword});
      if(error) return {ok:false, error};
      window._wpRecoveryConfirmed=false; // one-time use, like the link itself
      return {ok:true, email};
    }catch(e){ return {ok:false, error:e}; }
  }

  function clearRecoveryParamsFromUrl(){
    try{ history.replaceState(null, '', redirectBase()); }catch(e){}
  }

  W.CloudAuth = {
    cloudAuthAvailable, signInCloud, signOutCloud, linkAccountToCloud,
    syncCloudPassword, requestPasswordReset, isRecoveryLink,
    completePasswordReset, clearRecoveryParamsFromUrl, redirectBase
  };
})(window.WP=window.WP||{});
window.syncCloudPassword = async function(email, newPassword){
  return window.WP.CloudAuth.syncCloudPassword(email, newPassword);
};
