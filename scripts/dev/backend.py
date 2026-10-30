#!/usr/bin/env python3
"""Persistent local Selqiro V2 backend. Init once; ordinary starts never seed/reset.

All credentials stay in the private state directory. Each process is tied to that
directory and its Linux start identity. Stopping retains data and makes no file-
finality claim. Production and previous one-shot fixtures are never adopted.
"""
from pathlib import Path
import argparse, base64, fcntl, hashlib, hmac, json, os, secrets, signal, socket
import subprocess, sys, time, urllib.error, urllib.request, uuid
from urllib.parse import urlparse

HERE=Path(__file__).resolve().parent
DB='selqiro_publication_attempt_fixture'
KIND='selqiro-persistent-local-v2-v1'

def require(value, code):
    if not value: raise RuntimeError(code)

def save(m):
    p=Path(m['state'])/'backend.json'
    tmp=p.with_suffix('.next')
    tmp.write_text(json.dumps(m,indent=2,sort_keys=True)+'\n'); tmp.chmod(0o600); tmp.replace(p)

def secret_file(path, text):
    path=Path(path); path.write_text(text); path.chmod(0o600)

def load(state):
    state=Path(state).resolve(strict=True)
    require(not (state/'backend.json').is_symlink(),'state_symlink')
    m=json.loads((state/'backend.json').read_text())
    require(m['format']==KIND and m['state']==str(state) and str(uuid.UUID(m['run_id']))==m['run_id'],'state_binding')
    return m

def env_base(m):
    return {'PATH':str(Path(m['node']).parent)+':/usr/bin:/bin','LANG':'C.UTF-8','TZ':'UTC'}

def pg_env(m):
    return {**env_base(m),'LD_LIBRARY_PATH':str(Path(m['pg_bin']).parent/'lib'),'PGPASSWORD':m['postgres_password']}

def pg(m,args,*,input=None,unprivileged=False):
    options={'user':m['pg_uid'],'group':m['pg_gid'],'extra_groups':[]} if unprivileged and os.getuid()==0 else {}
    r=subprocess.run([str(Path(m['pg_bin'])/args[0]),*map(str,args[1:])],input=input,env=pg_env(m),text=True,capture_output=True,**options)
    if r.returncode:
        stamp=str(time.time_ns()); secret_file(Path(m['state'])/('pg-error-'+stamp+'.log'),r.stdout+r.stderr)
        raise RuntimeError('postgres_command_failed_'+args[0])
    return r.stdout

def sql(m,statement):
    return pg(m,['psql','-X','-qAt','-v','ON_ERROR_STOP=1','-h','127.0.0.1','-p',m['pg_port'],'-U','postgres','-d',DB],input=statement)

def pid_info(pid):
    p=Path('/proc')/str(pid)
    fields=(p/'stat').read_text().rsplit(') ',1)[1].split()
    if fields[0] in ('Z','X'):raise ProcessLookupError(pid)
    try: links={name:os.readlink(p/name) for name in ['exe','cwd']}
    except PermissionError:
        require(os.getuid()==0,'process_identity_unreadable')
        # Unprivileged PostgreSQL owns its /proc links. Read them as that same
        # service UID, without changing shared workspace permissions.
        owner=p.stat()
        r=subprocess.run([sys.executable,'-c',
          'import os,json,sys; p="/proc/"+sys.argv[1]; print(json.dumps({k:os.readlink(p+"/"+k) for k in ["exe","cwd"]}))',str(pid)],
          user=owner.st_uid,group=owner.st_gid,extra_groups=[],cwd='/tmp',text=True,capture_output=True)
        if r.returncode:
            # The process may have exited while the same-UID reader started.
            current=(p/'stat').read_text().rsplit(') ',1)[1].split()
            if current[0] in ('Z','X'):raise ProcessLookupError(pid)
            raise RuntimeError('process_identity_unreadable')
        links=json.loads(r.stdout)
    return {'pid':pid,'start_ticks':fields[19],'boot_id':Path('/proc/sys/kernel/random/boot_id').read_text().strip(),**links,
      'cmdline':(p/'cmdline').read_bytes().decode().rstrip('\0').split('\0')}

def alive(identity):
    try: actual=pid_info(identity['pid'])
    except (FileNotFoundError,ProcessLookupError): return False
    return actual==identity

def launch(m,name,args,env,cwd):
    previous=m.get('processes',{}).get(name)
    if previous and alive(previous): return
    log=Path(m['state'])/(name+'.log')
    with log.open('ab') as out:
        p=subprocess.Popen(list(map(str,args)),cwd=cwd,env=env,stdout=out,stderr=subprocess.STDOUT,start_new_session=True)
    log.chmod(0o600)
    for _ in range(30):
        try: identity=pid_info(p.pid);break
        except FileNotFoundError:
            if p.poll() is not None: raise RuntimeError(name+'_exited_at_start')
            time.sleep(.01)
    m.setdefault('processes',{})[name]=identity;save(m)

def ready(m,name,url,seconds=45):
    deadline=time.monotonic()+seconds
    opener=urllib.request.build_opener(urllib.request.ProxyHandler({}))
    while time.monotonic()<deadline:
        require(alive(m['processes'][name]),name+'_exited_before_ready')
        try:
            with opener.open(url,timeout=1) as r:
                if r.status==200:return
        except (OSError,urllib.error.URLError): pass
        time.sleep(.15)
    raise RuntimeError(name+'_readiness_timeout')

def free_port():
    with socket.socket() as s:s.bind(('127.0.0.1',0));return s.getsockname()[1]

def local_origin(value):
    u=urlparse(value)
    require(u.scheme=='http' and u.hostname in ['127.0.0.1','localhost'] and u.port and not u.username and not u.password
      and not u.params and not u.query and not u.fragment and u.path in ['', '/'],'loopback_origin_required')
    return f'http://{u.hostname}:{u.port}'

def token(secret,role):
    def enc(value):return base64.urlsafe_b64encode(json.dumps(value,separators=(',',':')).encode()).decode().rstrip('=')
    now=int(time.time())
    body=enc({'alg':'HS256','typ':'JWT'})+'.'+enc({'role':role,'iat':now,'exp':now+10*365*86400})
    return body+'.'+base64.urlsafe_b64encode(hmac.new(secret.encode(),body.encode(),hashlib.sha256).digest()).decode().rstrip('=')

def db_url(m,role,password):
    return f"postgresql://{role}:{password}@127.0.0.1:{m['pg_port']}/{DB}"

def start_pg(m):
    if m.get('processes',{}).get('postgres') and alive(m['processes']['postgres']):return
    pg(m,['pg_ctl','-D',Path(m['state'])/'data','-l',Path(m['state'])/'postgres.log','-w','-t','30','start'],unprivileged=True)
    pid=int((Path(m['state'])/'data/postmaster.pid').read_text().splitlines()[0])
    m.setdefault('processes',{})['postgres']=pid_info(pid);save(m)

def start_services(m, *, schema_pending=False):
    start_pg(m)
    base=env_base(m)
    authenv={**base,'GOTRUE_DB_DRIVER':'postgres','DATABASE_URL':db_url(m,'supabase_auth_admin',m['auth_password'])+'?sslmode=disable','DB_NAMESPACE':'auth',
      'GOTRUE_DB_MIGRATIONS_PATH':str(Path(m['auth_bin']).parent/'migrations'),'API_EXTERNAL_URL':m['gateway_origin']+'/auth/v1','GOTRUE_API_HOST':'127.0.0.1','PORT':str(m['auth_port']),
      'GOTRUE_JWT_SECRET':m['jwt_secret'],'GOTRUE_JWT_EXP':'3600','GOTRUE_JWT_AUD':'authenticated','GOTRUE_JWT_DEFAULT_GROUP_NAME':'authenticated','GOTRUE_JWT_ADMIN_ROLES':'service_role',
      'GOTRUE_SITE_URL':m['app_origin'],'GOTRUE_EXTERNAL_EMAIL_ENABLED':'true','GOTRUE_EXTERNAL_PHONE_ENABLED':'false','GOTRUE_MAILER_AUTOCONFIRM':'true',
      'GOTRUE_DISABLE_SIGNUP':'true','GOTRUE_TRACING_ENABLED':'false','GOTRUE_METRICS_ENABLED':'false','LOG_LEVEL':'warn'}
    launch(m,'auth',[m['auth_bin']],authenv,m['state']);ready(m,'auth',f"http://127.0.0.1:{m['auth_port']}/health")
    storageenv={**base,'NODE_ENV':'production','VERSION':'1.83.5','PROJECT_REF':'selqiro-isolated-integration','SERVER_HOST':'127.0.0.1','SERVER_PORT':str(m['storage_port']),'SERVER_REGION':'local',
      'AUTH_JWT_SECRET':m['jwt_secret'],'AUTH_JWT_ALGORITHM':'HS256','ANON_KEY':m['anon_key'],'SERVICE_KEY':m['service_key'],
      'DATABASE_URL':db_url(m,'supabase_storage_admin',m['storage_password']),'DATABASE_MAX_CONNECTIONS':'8','DATABASE_SEARCH_PATH':'storage,public',
      'DB_INSTALL_ROLES':'false','DB_ALLOW_MIGRATION_REFRESH':'false','DB_SUPER_USER':'supabase_storage_admin','STORAGE_BACKEND':'file','STORAGE_FILE_BACKEND_PATH':str(Path(m['state'])/'storage'),
      'STORAGE_VERSIONING_ENABLED':'false','STORAGE_S3_BUCKET':'isolated-physical-bucket','STORAGE_S3_REGION':'us-east-1','STORAGE_PUBLIC_URL':m['gateway_origin']+'/storage/v1',
      'S3_PROTOCOL_ACCESS_KEY_ID':m['s3_access_key'],'S3_PROTOCOL_ACCESS_KEY_SECRET':m['s3_secret_key'],'REQUEST_ALLOW_X_FORWARDED_PATH':'true','S3_ALLOW_FORWARDED_HEADER':'false',
      'UPLOAD_FILE_SIZE_LIMIT':'52428800','UPLOAD_FILE_SIZE_LIMIT_STANDARD':'52428800','PG_QUEUE_ENABLE':'false','RATE_LIMITER_ENABLED':'false','IMAGE_TRANSFORMATION_ENABLED':'false',
      'VECTOR_ENABLED':'false','VECTOR_STORE_MIGRATIONS_ENABLED':'false','ICEBERG_ENABLED':'false','OTEL_METRICS_ENABLED':'false','PROMETHEUS_METRICS_ENABLED':'false',
      'TRACING_ENABLED':'false','LOGFLARE_ENABLED':'false','EXPOSE_DOCS':'false','LOG_LEVEL':'warn','WORKERS_NUM':'1'}
    launch(m,'storage',[m['node'],Path(m['storage_dir'])/'dist/start/server.js'],storageenv,m['storage_dir'])
    ready(m,'storage',f"http://127.0.0.1:{m['storage_port']}/status",60)
    if schema_pending:return
    from init_schema import verify_schema
    verify_schema(m['run_id'],str(Path(m['state'])/'data'),lambda statement:sql(m,statement))
    restconf=Path(m['state'])/'postgrest.conf'
    secret_file(restconf,'\n'.join(['db-uri = '+json.dumps(db_url(m,'authenticator',m['rest_password'])),'db-schemas = "public"','db-anon-role = "anon"','db-pool = 5',
      'server-host = "127.0.0.1"','server-port = '+str(m['rest_port']),'jwt-secret = '+json.dumps(m['jwt_secret']),'log-level = "warn"','db-tx-end = "commit"','']))
    launch(m,'postgrest',[m['postgrest_bin'],restconf],base,m['state']);ready(m,'postgrest',f"http://127.0.0.1:{m['rest_port']}/")
    launch(m,'gateway',[m['node'],HERE/'gateway.cjs',Path(m['state'])/'backend.json'],base,m['state'])
    ready(m,'gateway',f"http://127.0.0.1:{m['gateway_port']}/health")

def app_environment(m):
    return {**env_base(m),'NODE_ENV':'development','SELQIRO_V2_LOCAL_INTEGRATION':'v1','NEXT_PUBLIC_SELQIRO_V2_LOCAL_INTEGRATION':'v1',
      'NEXT_PUBLIC_SUPABASE_URL':m['gateway_origin'],'SELQIRO_V2_APP_ORIGIN':m['app_origin'],'SELQIRO_V2_RUN_ID':m['run_id'],
      'NEXT_PUBLIC_SUPABASE_ANON_KEY':m['anon_key'],'SUPABASE_SERVICE_ROLE_KEY':m['service_key'],'SELQIRO_V2_S3_ENDPOINT':m['gateway_origin']+'/storage/v1/s3',
      'SELQIRO_V2_S3_REGION':'us-east-1','SELQIRO_V2_S3_ACCESS_KEY_ID':m['s3_access_key'],'SELQIRO_V2_S3_SECRET_ACCESS_KEY':m['s3_secret_key'],
      'SELQIRO_V2_S3_TENANT_ID':'selqiro-isolated-integration'}

def http(m,method,path,body=None,token=None):
    require(path.startswith(('/auth/v1/','/rest/v1/','/storage/v1/')),'http_path')
    request=urllib.request.Request(f"http://127.0.0.1:{m['gateway_port']}"+path,method=method,
      headers={'apikey':m['anon_key'],'Authorization':'Bearer '+(token or m['anon_key']),'Content-Type':'application/json'},
      data=json.dumps(body).encode() if body is not None else None)
    opener=urllib.request.build_opener(urllib.request.ProxyHandler({}))
    try:
        with opener.open(request,timeout=30) as r:return json.loads(r.read(1024*1024))
    except urllib.error.HTTPError as e:
        secret_file(Path(m['state'])/('http-error-'+str(time.time_ns())+'.log'),e.read(65536).decode(errors='replace'))
        raise RuntimeError('local_http_'+str(e.code)) from None

def init(args):
    state=Path(args.state).absolute()
    require(not state.exists(),'state_already_exists_use_start')
    source=Path(args.source).resolve(strict=True)
    binaries={name:str(Path(getattr(args,name)).resolve(strict=True)) for name in ['pg_bin','auth_bin','postgrest_bin','storage_dir','node']}
    require((Path(binaries['pg_bin'])/'postgres').is_file() and (Path(binaries['storage_dir'])/'dist/start/server.js').is_file(),'runtime_files_missing')
    gateway_port=args.gateway_port or free_port()
    require(1024<=gateway_port<=65535 and args.gateway_bind in ['127.0.0.1','0.0.0.0'],'gateway_config')
    app_origin=local_origin(args.app_origin)
    ports={name:free_port() for name in ['pg_port','auth_port','rest_port','storage_port']}
    require(len(set([*ports.values(),gateway_port,urlparse(app_origin).port]))==6,'port_collision')
    state.mkdir(mode=0o700,parents=True)
    pg_uid=65534 if os.getuid()==0 else os.getuid();pg_gid=65534 if os.getuid()==0 else os.getgid()
    if os.getuid()==0:os.chown(state,pg_uid,pg_gid)
    secret=secrets.token_hex(32)
    m={'format':KIND,'run_id':str(uuid.uuid4()),'state':str(state),'source':str(source),'stage':'CREATED',**binaries,**ports,
      'gateway_port':gateway_port,'gateway_bind':args.gateway_bind,'gateway_origin':f'http://127.0.0.1:{gateway_port}','app_origin':app_origin,
      'postgres_password':secrets.token_hex(24),'auth_password':secrets.token_hex(24),'storage_password':secrets.token_hex(24),'rest_password':secrets.token_hex(24),
      'jwt_secret':secret,'anon_key':token(secret,'anon'),'service_key':token(secret,'service_role'),'s3_access_key':secrets.token_hex(16),'s3_secret_key':secrets.token_hex(32),
      'pg_uid':pg_uid,'pg_gid':pg_gid,'processes':{},'initialized':False}
    save(m)
    return provision(m)

def provision(m):
    state=Path(m['state']);source=Path(m['source'])
    require(m['stage']=='CREATED' and not m['initialized'] and not (state/'data').exists(),'new_database_required')
    password=state/'bootstrap-password';secret_file(password,m['postgres_password']+'\n')
    if os.getuid()==0:os.chown(password,m['pg_uid'],m['pg_gid'])
    pg(m,['initdb','-D',state/'data','-U','postgres','--pwfile',password,'--auth-local=scram-sha-256','--auth-host=scram-sha-256','--encoding=UTF8','--no-locale'],unprivileged=True)
    with (state/'data/postgresql.conf').open('a') as out:out.write(f"\nlisten_addresses='127.0.0.1'\nport={m['pg_port']}\nunix_socket_directories=''\nmax_connections=50\nshared_buffers='32MB'\nlog_statement='none'\nlog_min_error_statement='panic'\n")
    m['stage']='POSTGRES_INITIALIZED';save(m)
    start_pg(m)
    return initialize_application(m)

def initialize_application(m):
    state=Path(m['state']);source=Path(m['source'])
    require(m['stage']=='POSTGRES_INITIALIZED' and not m['initialized'],'new_application_required')
    pg(m,['createdb','-h','127.0.0.1','-p',m['pg_port'],'-U','postgres',DB])
    sql(m,f"""CREATE ROLE authenticator NOINHERIT LOGIN PASSWORD '{m['rest_password']}';
CREATE ROLE anon NOLOGIN NOINHERIT; CREATE ROLE authenticated NOLOGIN NOINHERIT;
CREATE ROLE service_role NOLOGIN NOINHERIT BYPASSRLS;GRANT anon,authenticated,service_role TO authenticator;
CREATE ROLE supabase_auth_admin NOINHERIT LOGIN PASSWORD '{m['auth_password']}';
CREATE ROLE supabase_storage_admin NOINHERIT LOGIN PASSWORD '{m['storage_password']}';
GRANT anon,authenticated,service_role TO supabase_storage_admin;
CREATE SCHEMA auth AUTHORIZATION supabase_auth_admin; CREATE SCHEMA storage AUTHORIZATION supabase_storage_admin;
GRANT USAGE ON SCHEMA public,auth,storage TO anon,authenticated,service_role,supabase_auth_admin,supabase_storage_admin;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_storage_admin IN SCHEMA storage GRANT ALL ON TABLES TO anon,authenticated,service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_storage_admin IN SCHEMA storage GRANT ALL ON FUNCTIONS TO anon,authenticated,service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_storage_admin IN SCHEMA storage GRANT ALL ON SEQUENCES TO anon,authenticated,service_role;
ALTER ROLE supabase_auth_admin SET search_path TO auth,public;
ALTER ROLE supabase_storage_admin SET search_path TO storage,public; REVOKE CREATE ON SCHEMA public FROM PUBLIC;""")
    (state/'storage').mkdir(mode=0o700)
    m['stage']='ROLES_CREATED';save(m)
    start_services(m,schema_pending=True)
    from init_schema import initialize_schema
    result=initialize_schema(source,m['run_id'],str(state/'data'),lambda statement:sql(m,statement))
    secret_file(state/'schema-install.json',json.dumps(result,indent=2)+'\n')
    m['stage']='APPLICATION_SCHEMA_READY';save(m)
    start_services(m)
    http(m,'POST','/storage/v1/bucket',{'id':'listing-publication-private','name':'listing-publication-private','public':False,'file_size_limit':52428800},m['service_key'])
    # New empty local environments receive the same private message-photo
    # bucket contract via Storage's API. Existing environments are never reset
    # or silently migrated by this initializer.
    message_bucket={'id':'message-attachments-v2','name':'message-attachments-v2','public':False,
                    'file_size_limit':2000000,'allowed_mime_types':['image/webp']}
    http(m,'POST','/storage/v1/bucket',message_bucket,m['service_key'])
    observed=http(m,'GET','/storage/v1/bucket/message-attachments-v2',None,m['service_key'])
    require(isinstance(observed,dict) and all(observed.get(k)==v for k,v in message_bucket.items()),
            'local_message_bucket_contract')
    from seed_accounts import seed_accounts
    result=seed_accounts(state,m['run_id'],lambda statement:sql(m,statement),lambda method,path,body=None,token=None:http(m,method,path,body,token),service_key=m['service_key'])
    m['stage']='READY';m['initialized']=True;save(m)
    secret_file(state/'app-env.json',json.dumps(app_environment(m),indent=2)+'\n')
    return status(m)

def status(m):
    return {'status':m['stage'],'run_id':m['run_id'],'state':m['state'],'initialized':m['initialized'],
      'app_origin':m['app_origin'],'gateway_origin':m['gateway_origin'],
      'services':{k:alive(v) for k,v in m['processes'].items()},'data_preserved':True}

def stop(m):
    for name in ['gateway','postgrest','storage','auth']:
        identity=m['processes'].get(name)
        if not identity or not alive(identity):continue
        fd=os.pidfd_open(identity['pid'])
        try:
            require(alive(identity),'owned_process_exit_race')
            signal.pidfd_send_signal(fd,signal.SIGTERM)
            import select
            poll=select.poll();poll.register(fd,select.POLLIN)
            require(bool(poll.poll(15000)),name+'_graceful_stop_timeout')
        finally:os.close(fd)
    identity=m['processes'].get('postgres')
    if identity and alive(identity):pg(m,['pg_ctl','-D',Path(m['state'])/'data','-w','-t','30','-m','fast','stop'],unprivileged=True)
    m['stage']='STOPPED';save(m)
    result=status(m);result['file_finality_asserted']=False;return result

def main():
    p=argparse.ArgumentParser();p.add_argument('action',choices=['init','start','status','stop']);p.add_argument('--state',required=True)
    for name in ['source','pg-bin','auth-bin','postgrest-bin','storage-dir','node','app-origin']:p.add_argument('--'+name)
    p.add_argument('--gateway-port',type=int);p.add_argument('--gateway-bind',default='127.0.0.1')
    args=p.parse_args()
    state=Path(args.state).absolute()
    # Outside the state directory so even first creation is exclusive.
    state.parent.mkdir(parents=True,exist_ok=True)
    lock=state.parent/(state.name+'.lock')
    with lock.open('a') as f:
        fcntl.flock(f,fcntl.LOCK_EX|fcntl.LOCK_NB)
        if args.action=='init':result=init(args)
        else:
            m=load(state)
            if args.action=='start':
                require(m['initialized'],'initialization_incomplete_do_not_reseed')
                start_services(m);m['stage']='READY';save(m)
                secret_file(state/'app-env.json',json.dumps(app_environment(m),indent=2)+'\n');result=status(m)
            elif args.action=='stop':result=stop(m)
            else:result=status(m)
        print(json.dumps(result))

if __name__=='__main__':
    try:main()
    except Exception as error:
        print(json.dumps({'status':'STOPPED_WITH_ERROR_DATA_PRESERVED','error':str(error)}));raise SystemExit(1)
