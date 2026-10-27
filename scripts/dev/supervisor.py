#!/usr/bin/env python3
"""Reusable entrypoint for one new, owned local development container."""
import argparse
import fcntl
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import signal
import subprocess
import sys
import tarfile
import time
import urllib.request
import uuid

HERE = Path(__file__).resolve().parent
RUNTIME = Path('/opt/selqiro/runtime')
stopping = False


def require(ok, code):
    if not ok:
        raise RuntimeError(code)


def write_json(path, value):
    require(not path.is_symlink(), 'state_symlink')
    temp = path.with_name(path.name + '.new-' + uuid.uuid4().hex)
    fd = os.open(temp, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(fd, 'w') as output:
        json.dump(value, output, sort_keys=True, indent=2)
        output.write('\n')
    temp.replace(path)


def source_path(name):
    p = PurePosixPath(name)
    require(not p.is_absolute() and p.parts and all(
        part not in ('.', '..', '.git', '.next', 'node_modules')
        and not part.startswith('.env') for part in p.parts), 'source_path')
    return p


def source_target(root, name):
    p = source_path(name)
    target = root.joinpath(*p.parts)
    for parent in [*target.parents][:len(p.parts)]:
        require(not parent.is_symlink(), 'source_parent_symlink')
    require(not target.is_symlink(), 'source_symlink')
    return target


def sync_source(root, state):
    require(str(root) == '/opt/selqiro/app' and root.is_dir() and not root.is_symlink(), 'source_root')
    manifest = json.loads((HERE / 'source.json').read_text())
    expected = manifest['files']
    require(0 < len(expected) <= 4096, 'source_count')
    require(hashlib.sha256(json.dumps(expected, sort_keys=True, separators=(',', ':')).encode()).hexdigest()
            == manifest['sha256_map'], 'source_manifest')
    with tarfile.open(HERE / 'source.tar', 'r:') as archive:
        members = archive.getmembers()
        require(len(members) == len(expected) and {x.name for x in members} == set(expected), 'source_archive_paths')
        bodies = {}
        for member in members:
            source_path(member.name)
            require(member.isfile() and 0 <= member.size <= 32 * 1024 * 1024, 'source_archive_kind')
            data = archive.extractfile(member).read()
            require(hashlib.sha256(data).hexdigest() == expected[member.name], 'source_archive_hash')
            bodies[member.name] = data
    previous_path = state / 'source-files.json'
    previous = json.loads(previous_path.read_text())['files'] if previous_path.exists() else \
        json.loads(Path('/opt/selqiro/source-manifest.json').read_text())['source_hashes']
    # Remove only an obsolete, unchanged source file recorded by this same source
    # history. Database/Storage, node_modules and unrecorded files are outside it.
    for name in sorted(set(previous) - set(expected)):
        target = source_target(root, name)
        if target.exists():
            require(target.is_file() and hashlib.sha256(target.read_bytes()).hexdigest() == previous[name], 'obsolete_source_changed')
            target.unlink()
    for name, data in bodies.items():
        target = source_target(root, name)
        target.parent.mkdir(parents=True, exist_ok=True)
        temp = target.with_name(target.name + '.selqiro-new-' + uuid.uuid4().hex)
        fd = os.open(temp, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o644)
        with os.fdopen(fd, 'wb') as output:
            output.write(data)
        temp.replace(target)
    write_json(previous_path, manifest)
    return manifest['sha256_map']


def main():
    global stopping
    parser = argparse.ArgumentParser()
    parser.add_argument('--state', required=True)
    parser.add_argument('--source', required=True)
    parser.add_argument('--instance', required=True)
    parser.add_argument('--app-port', type=int, required=True)
    parser.add_argument('--gateway-port', type=int, required=True)
    args = parser.parse_args()
    require(str(uuid.UUID(args.instance)) == args.instance, 'instance')
    require(1024 <= args.app_port <= 65535 and 1024 <= args.gateway_port <= 65535
            and args.app_port != args.gateway_port, 'ports')
    state = Path(args.state)
    require(str(state) == '/opt/selqiro/development-state' and state.is_dir() and not state.is_symlink(), 'volume_root')
    backend_state = state / 'backend'
    source = Path(args.source)
    own = state / 'owner.json'
    if own.exists():
        require(json.loads(own.read_text()) == {'instance': args.instance}, 'volume_owner')
    else:
        require(not any(state.iterdir()), 'new_volume_not_empty')
        write_json(own, {'instance': args.instance})
    lock = state / 'supervisor.lock'
    fd = os.open(lock, os.O_WRONLY | os.O_CREAT | os.O_NOFOLLOW, 0o600)
    with os.fdopen(fd, 'w') as locked:
        fcntl.flock(locked, fcntl.LOCK_EX | fcntl.LOCK_NB)
        def on_stop(_signal, _frame):
            global stopping
            stopping = True
        signal.signal(signal.SIGTERM, on_stop)
        signal.signal(signal.SIGINT, on_stop)
        app = None
        failure = None
        backend_owned = False
        base = {'PATH': str(RUNTIME / 'node/bin') + ':/usr/bin:/bin', 'LANG': 'C.UTF-8',
                'TZ': 'UTC', 'PYTHONDONTWRITEBYTECODE': '1', 'PYTHONUNBUFFERED': '1'}
        app_origin = 'http://127.0.0.1:' + str(args.app_port)
        launch = json.loads((HERE / 'launch.json').read_text())
        require(launch['instance'] == args.instance and str(uuid.UUID(launch['generation'])) == launch['generation'], 'launch_owner')
        public = {'instance': args.instance, 'generation': launch['generation'], 'app_url': app_origin,
                  'gateway_url': 'http://127.0.0.1:' + str(args.gateway_port)}
        def report(status, **extra):
            value = {**public, 'status': status, **extra}
            write_json(state / 'status.json', value)
            print(json.dumps(value), flush=True)
        def backend(action, extra=(), timeout=180):
            log_path = state / 'backend-control.log'
            log_fd = os.open(log_path, os.O_WRONLY | os.O_CREAT | os.O_APPEND | os.O_NOFOLLOW, 0o600)
            with os.fdopen(log_fd, 'ab') as log:
                result = subprocess.run([sys.executable, '-B', str(HERE / 'backend.py'), action,
                    '--state', str(backend_state), *extra], env=base, stdout=log, stderr=subprocess.STDOUT,
                    timeout=timeout)
            require(result.returncode == 0, 'backend_' + action + '_failed')
        try:
            report('STARTING')
            public['source_map_sha256'] = sync_source(source, state)
            require(public['source_map_sha256'] == launch['source_map_sha256'], 'launch_source_binding')
            config = backend_state / 'backend.json'
            if config.exists():
                require(not config.is_symlink(), 'backend_config_symlink')
                saved = json.loads(config.read_text())
                expected = {'source': str(source), 'state': str(backend_state),
                    'app_origin': app_origin, 'gateway_origin': public['gateway_url'],
                    'gateway_port': args.gateway_port, 'gateway_bind': '0.0.0.0',
                    'pg_bin': str((RUNTIME / 'postgresql/bin').resolve(strict=True)),
                    'auth_bin': str((RUNTIME / 'auth-bin/auth').resolve(strict=True)),
                    'postgrest_bin': str((RUNTIME / 'postgrest/postgrest').resolve(strict=True)),
                    'storage_dir': str((RUNTIME / 'storage-src/storage-1.83.5').resolve(strict=True)),
                    'node': str((RUNTIME / 'node/bin/node').resolve(strict=True))}
                require(all(saved.get(k) == v for k, v in expected.items()), 'saved_backend_binding_changed')
                require(saved.get('initialized') is True, 'backend_initialization_incomplete_preserved')
                backend_owned = True
                backend('start')
            else:
                require(not backend_state.exists(), 'backend_partial_state_preserved')
                backend_owned = True
                backend('init', ['--source', str(source), '--pg-bin', str(RUNTIME / 'postgresql/bin'),
                    '--auth-bin', str(RUNTIME / 'auth-bin/auth'), '--postgrest-bin', str(RUNTIME / 'postgrest/postgrest'),
                    '--storage-dir', str(RUNTIME / 'storage-src/storage-1.83.5'), '--node', str(RUNTIME / 'node/bin/node'),
                    '--app-origin', app_origin, '--gateway-port', str(args.gateway_port), '--gateway-bind', '0.0.0.0'])
            public['run_id'] = json.loads(config.read_text())['run_id']
            if stopping:
                return
            env = json.loads((backend_state / 'app-env.json').read_text())
            env.update(NEXT_TELEMETRY_DISABLED='1')
            next_log = state / 'next.log'
            log_fd = os.open(next_log, os.O_WRONLY | os.O_CREAT | os.O_APPEND | os.O_NOFOLLOW, 0o600)
            with os.fdopen(log_fd, 'ab') as log:
                app = subprocess.Popen([str(RUNTIME / 'node/bin/node'), 'node_modules/next/dist/bin/next',
                    'dev', '--webpack', '--hostname', '0.0.0.0', '--port', str(args.app_port)], cwd=source, env=env,
                    stdout=log, stderr=subprocess.STDOUT, start_new_session=True)
            opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))
            deadline = time.monotonic() + 90
            while not stopping and time.monotonic() < deadline:
                require(app.poll() is None, 'next_exited_before_ready')
                try:
                    with opener.open(app_origin + '/v2/products', timeout=3) as response:
                        if response.status == 200:
                            report('READY')
                            break
                except OSError:
                    pass
                time.sleep(.25)
            else:
                require(stopping, 'next_readiness_timeout')
            while not stopping:
                require(app.poll() is None, 'next_exited')
                time.sleep(.25)
        except Exception as error:
            code = str(error)
            if not code.replace('_', '').isalnum():
                code = type(error).__name__
            failure = code
            report('ERROR_PRESERVED', error=code)
            raise
        finally:
            try:
                if app is not None and app.poll() is None:
                    app.terminate()
                    app.wait(timeout=20)
                if backend_owned and (backend_state / 'backend.json').exists():
                    backend('stop', timeout=100)
            except Exception as error:
                report('STOP_INCOMPLETE_PRESERVED', error=failure or type(error).__name__)
                raise
            report('STOPPED_WITH_ERROR' if failure else 'STOPPED',
                   **({'error': failure} if failure else {}), file_finality_asserted=False)


if __name__ == '__main__':
    try:
        main()
    except Exception:
        raise SystemExit(1)
