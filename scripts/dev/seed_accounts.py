"""First-use accounts for the new persistent local environment; no historical seed.

Normal start/stop never calls this module. Passwords are saved only to the owned
local state directory with mode 0600; no access or refresh tokens are retained.
No listing, image, conversation, message or policy acceptance is pre-created.
"""
import hashlib
import json
import os
from pathlib import Path
import secrets
import uuid

from init_schema import literal


def private_write(path, value):
    data = (json.dumps(value, ensure_ascii=False, indent=2) + "\n").encode()
    temporary = path.with_name(path.name + ".new")
    fd = os.open(temporary, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    try:
        with os.fdopen(fd, "wb") as output:
            output.write(data)
            output.flush()
            os.fsync(output.fileno())
        os.replace(temporary, path)
    except BaseException:
        # Preserve the partial record for diagnosis; never repeat Auth creation
        # automatically after an uncertain failure.
        raise


def seed_accounts(state_dir, run_id, sql_callback, http_callback, *, service_key):
    """Create seller/buyer only after guarded schema init on the new local target.

    http_callback(method, path, body=None, token=None) uses the lifecycle's exact
    loopback gateway and returns parsed JSON. It must not retry a write.
    """
    if str(uuid.UUID(run_id)) != run_id or not uuid.UUID(run_id).int:
        raise ValueError("Canonical local environment UUID required")
    state = Path(state_dir).resolve(strict=True)
    target = state / "accounts.json"
    if target.exists() or target.with_name(target.name + ".new").exists():
        raise RuntimeError("Local account setup already recorded; normal start must reuse it")
    rows = sql_callback("""BEGIN READ ONLY;
SELECT json_build_object('run_id',(SELECT environment_id FROM selqiro_local_development.environment),
 'users',(SELECT count(*) FROM auth.users),'profiles',(SELECT count(*) FROM public.profiles),
 'identities',(SELECT count(*) FROM public.identities),'policies',(SELECT count(*) FROM public.publication_policy_documents));
COMMIT;""")
    values = [json.loads(line) for line in rows.splitlines() if line.startswith("{")]
    if values != [{"run_id": run_id, "users": 0, "profiles": 0, "identities": 0, "policies": 0}]:
        raise RuntimeError("Account seed requires the new empty owned local application")

    record = {"format": "selqiro-local-development-accounts-v1", "run_id": run_id,
              "status": "INITIALIZING", "accounts": []}
    private_write(target, record)
    policy_id = str(uuid.uuid4())
    policy_body = ("See on Selqiro kohalik arenduskeskkond. Siin loodud kuulutused ja pildid "
                   "säilivad selles arenduskeskkonnas ega avaldu productionis.")
    content_hash = hashlib.sha256(policy_body.encode()).hexdigest()
    metadata = json.dumps({"integration_run_id": run_id, "local_development": True})
    sql_callback("""BEGIN;
INSERT INTO public.publication_policy_documents
 (id,policy_key,policy_version,locale,title,summary,body_text,content_hash,status,
  applies_to_content_types,requires_user_acceptance,metadata)
 VALUES (%s,'marketplace-general',%s,'et-EE','Kohaliku arenduse avaldamistingimused',
  'Andmed jäävad kohalikku arenduskeskkonda.',%s,%s,'active',ARRAY['listing'],true,%s::jsonb);
COMMIT;""" % tuple(literal(x) for x in (policy_id, "local-" + run_id[:8], policy_body, content_hash, metadata)))
    record["policy_id"] = policy_id
    private_write(target, record)

    for name, display in (("seller", "Arendusmüüja"), ("buyer", "Arendusostja")):
        account = {"name": name, "email": "selqiro-dev-" + run_id[:8] + "-" + name + "@example.invalid",
                   "password": secrets.token_urlsafe(24), "display_name": display, "status": "AUTH_CREATE_PENDING"}
        record["accounts"].append(account)
        private_write(target, record)
        created = http_callback("POST", "/auth/v1/admin/users", {
            "email": account["email"], "password": account["password"], "email_confirm": True,
            "user_metadata": {"local_development_environment": run_id, "display_name": display},
        }, service_key)
        user_id = str(uuid.UUID(created["id"]))
        identity_id = str(uuid.uuid4())
        slug = "dev-" + run_id[:8] + "-" + name
        account.update({"user_id": user_id, "identity_id": identity_id, "slug": slug,
                        "status": "PROFILE_CREATE_PENDING"})
        private_write(target, record)
        fields = (user_id, account["email"], display, slug, identity_id, user_id,
                  display, user_id, user_id, identity_id, display, slug, user_id, user_id,
                  identity_id, user_id)
        sql_callback("""BEGIN;
INSERT INTO public.profiles(id,email,store_name,store_slug,language) VALUES(%s,%s,%s,%s,'et');
INSERT INTO public.identities(id,type,user_id,display_name,status,created_by,updated_by)
 VALUES(%s,'private',%s,%s,'active',%s,%s);
INSERT INTO public.identity_profiles(identity_id,display_name,slug,city,country,created_by_user_id,updated_by_user_id)
 VALUES(%s,%s,%s,'Paide','Estonia',%s,%s);
UPDATE public.profiles SET active_identity_id=%s WHERE id=%s;
COMMIT;""" % tuple(literal(x) for x in fields))
        session = http_callback("POST", "/auth/v1/token?grant_type=password",
                                {"email": account["email"], "password": account["password"]})
        if session.get("user", {}).get("id") != user_id:
            raise RuntimeError("New local account password login did not bind expected user")
        account["status"] = "READY"
        private_write(target, record)
    record["status"] = "READY"
    private_write(target, record)
    return {"status": "LOCAL_DEVELOPMENT_ACCOUNTS_CREATED", "run_id": run_id,
            "accounts": [{k: account[k] for k in ("name", "email", "user_id", "identity_id", "slug")}
                         for account in record["accounts"]],
            "credentials_path": str(target), "policy_acceptance_preseeded": False}
