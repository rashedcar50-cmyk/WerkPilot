/* Cloud (Supabase Auth) identity layer -- added 2026-11-08, made the
 * SOLE login gate on 2026-11-13 (see js/app.js's login()/completeLogin()).
 *
 * Design: logging into the app IS signing into this real Supabase Auth
 * identity -- there is no separate local username/password check left
 * (the old dual system was the root cause of the original cross-device
 * report: each device's own, independently-set local password only
 * coincidentally matched the shared cloud password on the one device
 * that first created it). RLS (row level security) on the Supabase side
 * can therefore always tell who is asking, never trusting an anon
 * request (see supabase/rls-fix-proposal/).
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

  // Login-unification (2026-11-13): there is no "link this device"
  // step anymore -- login (above) already is the cloud sign-in, so the
  // old linkAccountToCloud()/syncCloudPassword() dance (sending THIS
  // device's local password as a guess at the cloud password, then
  // trying to keep a separate local hash in sync with it forever after)
  // is gone outright, not just unused. That guesswork was the actual
  // root cause of the original cross-device report: a second device's
  // independently-set local password only ever coincidentally matched
  // the real cloud password on the one device that first created it.
  //
  // Now that login IS the cloud session,
  // "change password" has exactly one real target -- the cloud account's
  // own password -- instead of a local hash that then had to be kept in
  // sync with it. Only does anything if a cloud session already exists,
  // which it always does for a logged-in user under the new flow.
  async function changeCloudPassword(newPassword){
    const sb = client();
    if(!sb) return {ok:false, skipped:true};
    try{
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
    cloudAuthAvailable, signInCloud, signOutCloud,
    changeCloudPassword, requestPasswordReset, isRecoveryLink,
    completePasswordReset, clearRecoveryParamsFromUrl, redirectBase
  };
})(window.WP=window.WP||{});
