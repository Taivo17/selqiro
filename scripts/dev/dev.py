#!/usr/bin/env python3
"""Normal start/stop commands for Selqiro's separate persistent LOCAL workspace.

Uses an already present, exact reviewed image. No pull, build, reset, container
removal, host source write, or historical session entrypoint is implemented.
"""
import argparse
import fcntl
import hashlib
import io
import json
import os
from pathlib import Path, PurePosixPath
import re
import socket
import stat
import subprocess
import sys
import tarfile
import time
from urllib.parse import urlparse
import uuid

HERE = Path(__file__).resolve().parent
STATE = Path.home() / 'Library/Application Support/Selqiro/v2-development'
IMAGE = 'sha256:705e1b28d6f9bc39a0668804f4853d8a96024a2262a98e3309abacb820a706db'
LOCK_SHA = 'c052a145edbe7f9a560285867ea69491331c16fc63ec6fdfe7143a422f668941'
PACKAGE_SHA = '969a6726ee13e23323489981ffd152d173e148d482db60f69928b7001e67d142'
IMAGE_LABELS = {'org.selqiro.source-map-sha256': '3680453f440a94f5a7546be98952628ee2ef21861cee60d7099738b19b3a1ffa',
    'org.selqiro.accepted-base': 'e95fa9ce1d41b9b4c6e4884b6076f414173a946d', 'org.selqiro.runtime-platform': 'linux/arm64'}
FORMAT = 'selqiro-local-development-host-v1'
RUNTIME_FILES = {'dev.py', 'supervisor.py', 'backend.py', 'gateway.cjs', 'init_schema.py', 'seed_accounts.py',
    'schema_compose.py', 'schema_sources.py', 'schema_provenance.json',
    'schema_fragments/read-extension.sql', 'schema_fragments/profile-read-continuation.sql', 'docker-client/config.json'}
SKIP = {'.git', '.next', 'node_modules', '__pycache__', 'coverage', 'dist', 'build', '.venv', 'venv'}


def require(ok, code):
    if not ok:
        raise RuntimeError(code)


def digest(data):
    return hashlib.sha256(data).hexdigest()


def json_bytes(value):
    return (json.dumps(value, sort_keys=True, indent=2) + '\n').encode()


def checked_json(data):
    require(isinstance(data, bytes) and 0 < len(data) <= 2 * 1024 * 1024, 'metadata_json_bound')
    def pairs(items):
        out = {}
        for key, value in items:
            require(key not in out, 'metadata_duplicate_key')
            out[key] = value
        return out
    def invalid(_value):
        raise RuntimeError('metadata_nonfinite_number')
    return json.loads(data, object_pairs_hook=pairs, parse_constant=invalid)


def cloud_setting():
    path = Path.home() / 'Library/Group Containers/group.com.docker/settings-store.json'
    fd = os.open(path, os.O_RDONLY | os.O_NOFOLLOW)
    with os.fdopen(fd, 'rb') as source:
        before = os.fstat(source.fileno())
        require(stat.S_ISREG(before.st_mode) and before.st_uid in (0, os.getuid())
                and not before.st_mode & 0o022 and 0 < before.st_size <= 2 * 1024 * 1024, 'desktop_settings_kind')
        data = source.read(2 * 1024 * 1024 + 1)
        after = os.fstat(source.fileno())
    identity = lambda s: (s.st_dev, s.st_ino, s.st_size, s.st_mtime_ns, s.st_ctime_ns)
    require(identity(before) == identity(after) == identity(path.lstat()), 'desktop_settings_changed')
    value = checked_json(data)
    require(isinstance(value, dict) and not any(k.lower() == 'enablecloud' and k != 'enableCloud' for k in value), 'desktop_settings_schema')
    require('enableCloud' not in value or value['enableCloud'] is False, 'docker_offload_must_be_disabled')
    # Absent is Docker's documented false default; live stopped status below is
    # still mandatory. No other settings or account fields are returned.
    return 'EXPLICIT_FALSE' if 'enableCloud' in value else 'DEFAULT_FALSE'


def environment():
    return {'PATH': os.environ.get('PATH', '/usr/bin:/bin'), 'HOME': str(Path.home()), 'LANG': 'C',
            'GIT_CONFIG_NOSYSTEM': '1', 'GIT_CONFIG_GLOBAL': '/dev/null', 'GIT_OPTIONAL_LOCKS': '0'}


def command(argv, *, data=None, timeout=20, allow_missing=False):
    result = subprocess.run(argv, input=data, capture_output=True, env=environment(), timeout=timeout)
    if result.returncode:
        if allow_missing and any(word in result.stderr.lower() for word in (b'no such', b'not found', b'could not find')):
            return None
        if b'cannot connect to' in result.stderr.lower() or b'is the docker daemon running' in result.stderr.lower():
            raise RuntimeError('docker_desktop_not_running')
        raise RuntimeError('command_failed_' + Path(argv[0]).name + '_' + str(result.returncode))
    return result.stdout


def private_json(path, value):
    require(not path.is_symlink(), 'state_symlink')
    temp = path.with_name(path.name + '.new-' + uuid.uuid4().hex)
    fd = os.open(temp, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(fd, 'wb') as output:
        output.write(json_bytes(value))
        output.flush()
        os.fsync(output.fileno())
    temp.replace(path)


def public_path(name):
    p = PurePosixPath(name)
    return bool(p.parts) and not p.is_absolute() and all(
        part not in SKIP and part not in ('.', '..') and not part.startswith('.env')
        and (not part.startswith('.') or part == '.gitignore') for part in p.parts)


def source_snapshot(root):
    require(root.is_dir() and not root.is_symlink(), 'source_directory')
    if (root / '.git').exists():
        raw = command(['git', '-c', 'core.fsmonitor=false', '-C', str(root), 'ls-files', '-z', '--cached', '--others', '--exclude-standard'])
        deleted = command(['git', '-c', 'core.fsmonitor=false', '-C', str(root), 'ls-files', '-z', '--deleted'])
        deleted = {n.decode('utf-8') for n in deleted.split(b'\0') if n}
        names = sorted({n.decode('utf-8') for n in raw.split(b'\0')
                        if n and public_path(n.decode('utf-8')) and n.decode('utf-8') not in deleted})
    else:
        names = []
        for directory, folders, files in os.walk(root, followlinks=False):
            folders[:] = sorted(d for d in folders if public_path(str((Path(directory) / d).relative_to(root))))
            require(not any((Path(directory) / d).is_symlink() for d in folders), 'public_source_directory_symlink')
            names.extend(str((Path(directory) / f).relative_to(root)) for f in files
                         if public_path(str((Path(directory) / f).relative_to(root))))
        names.sort()
    bodies = {}
    for name in names:
        path = root / name
        require(not path.is_symlink() and not any(p.is_symlink() for p in path.parents if p != root.parent), 'public_source_symlink')
        before = path.stat()
        require(stat.S_ISREG(before.st_mode) and before.st_size <= 32 * 1024 * 1024, 'source_file_kind_or_size')
        data = path.read_bytes()
        after = path.stat()
        require((before.st_ino, before.st_size, before.st_mtime_ns) == (after.st_ino, after.st_size, after.st_mtime_ns), 'source_changed_during_read')
        bodies[name] = data
    require(0 < len(bodies) <= 4096 and sum(map(len, bodies.values())) <= 100 * 1024 * 1024, 'source_snapshot_bounds')
    require(digest(bodies.get('package-lock.json', b'')) == LOCK_SHA
            and digest(bodies.get('package.json', b'')) == PACKAGE_SHA, 'pinned_image_dependency_lock_required')
    return bodies


def runtime_snapshot():
    path = HERE / 'runtime-manifest.json'
    require(path.is_file() and not path.is_symlink(), 'runtime_manifest_missing')
    manifest = json.loads(path.read_text())
    require(manifest['format'] == 'selqiro-local-development-runtime-v1'
            and set(manifest['files']) == RUNTIME_FILES, 'runtime_manifest_paths')
    files = {}
    for name, row in manifest['files'].items():
        path = HERE / name
        require(path.is_file() and not path.is_symlink() and not path.parent.is_symlink(), 'runtime_file_kind')
        data = path.read_bytes()
        require(len(data) == row['bytes'] and digest(data) == row['sha256'], 'runtime_file_changed')
        files[name] = data
    files['runtime-manifest.json'] = json_bytes(manifest)
    return files, digest(json_bytes(manifest))


def archive(files):
    out = io.BytesIO()
    with tarfile.open(fileobj=out, mode='w') as tar:
        for name, data in sorted(files.items()):
            entry = tarfile.TarInfo(name)
            entry.size = len(data)
            entry.mode = 0o644
            tar.addfile(entry, io.BytesIO(data))
    return out.getvalue()


class Docker:
    def __init__(self):
        require(sys.platform == 'darwin', 'macos_local_controller_required')
        routing = ('DOCKER_HOST', 'DOCKER_CONTEXT', 'DOCKER_TLS', 'DOCKER_TLS_VERIFY', 'DOCKER_CERT_PATH',
                   'DOCKER_CONFIG', 'DOCKER_API_VERSION', 'DOCKER_CUSTOM_HEADERS')
        require(not any(os.environ.get(k) for k in routing), 'docker_environment_override_refused')
        desktop = Path('/Applications/Docker.app')
        binary = desktop / 'Contents/Resources/bin/docker'
        plugin = desktop / 'Contents/Resources/cli-plugins/docker-offload'
        for path in (desktop, binary, plugin.parent, plugin):
            require(path.exists() and path.resolve() == path and path.stat().st_uid in (0, os.getuid())
                    and not path.stat().st_mode & 0o022, 'canonical_docker_desktop_required')
        require(os.access(binary, os.X_OK), 'docker_desktop_cli_required')
        command(['/usr/bin/codesign', '--verify', '--strict', str(desktop)], timeout=60)
        self.exe = str(binary)
        config = HERE / 'docker-client/config.json'
        require(config.is_file() and not config.is_symlink() and not config.parent.is_symlink()
                and checked_json(config.read_bytes()) == {'cliPluginsExtraDirs': [str(plugin.parent)]}, 'fixed_docker_client_config_required')
        c = config.stat()
        self.config_id = (c.st_dev, c.st_ino, c.st_size, c.st_mtime_ns)
        self.context = command([self.exe, 'context', 'show']).decode().strip()
        context = checked_json(command([self.exe, 'context', 'inspect', self.context, '--format', '{{json .}}']))
        require(context.get('Name') == self.context and isinstance(context.get('Metadata', {}), dict)
                and not any(k.lower() == 'cloud.docker.com' or k.lower().startswith('cloud.docker.run.')
                            for k in context.get('Metadata', {})), 'cloud_docker_context_refused')
        endpoint = context.get('Endpoints', {}).get('docker', {})
        require(endpoint.get('SkipTLSVerify', False) is False, 'docker_context_tls_override')
        endpoint = endpoint.get('Host', '')
        parsed = urlparse(endpoint)
        require(parsed.scheme == 'unix' and not parsed.netloc and not parsed.query and not parsed.fragment
                and parsed.path.startswith('/'), 'local_unix_docker_socket_required')
        self.socket = Path(parsed.path).resolve(strict=True)
        s = self.socket.stat()
        require(stat.S_ISSOCK(s.st_mode) and s.st_uid in (0, os.getuid()), 'docker_socket_kind')
        self.socket_id = (s.st_dev, s.st_ino)
        self.daemon = self.local_engine()
        image = json.loads(self.call('image', 'inspect', IMAGE))[0]
        require(image['Id'] == IMAGE and image['Os'] == 'linux' and image['Architecture'] == 'arm64'
                and all(image['Config'].get('Labels', {}).get(k) == v for k, v in IMAGE_LABELS.items()), 'reviewed_image_required')

    def call(self, *args, **kwargs):
        s = self.socket.stat()
        require(stat.S_ISSOCK(s.st_mode) and (s.st_dev, s.st_ino) == self.socket_id, 'docker_socket_changed')
        c = (HERE / 'docker-client/config.json').stat()
        require((c.st_dev, c.st_ino, c.st_size, c.st_mtime_ns) == self.config_id, 'docker_client_config_changed')
        return command([self.exe, '--config', str(HERE / 'docker-client'), '--host', 'unix://' + str(self.socket), *args], **kwargs)

    def local_engine(self):
        setting = cloud_setting()
        def offload():
            value = checked_json(self.call('offload', 'status', '--format', 'json'))
            require(isinstance(value, dict) and value.get('status') == 'STATUS_STOPPED'
                    and value.get('engineStatus') == 'ENGINE_STATUS_STOPPED', 'docker_offload_not_stopped')
        # Check Offload before /info; an idle cloud engine can otherwise wake.
        offload()
        info = checked_json(self.call('info', '--format', '{{json .}}'))
        require(info.get('OSType') == 'linux' and info.get('OperatingSystem') == 'Docker Desktop'
                and info.get('Architecture') in ('arm64', 'aarch64'), 'local_native_desktop_required')
        require(isinstance(info.get('ID'), str) and re.fullmatch('[A-Za-z0-9][A-Za-z0-9:._-]{7,127}', info['ID']), 'docker_daemon_identity')
        version = info.get('ServerVersion', '')
        require(isinstance(version, str) and re.fullmatch(r'[0-9]+\.[0-9]+\.[0-9]+(?:[-+][A-Za-z0-9._-]+)?', version)
                and int(version.split('.')[0]) >= 28, 'docker_desktop_version_required')
        markers = info.get('Labels') or []
        require(isinstance(markers, list) and all(isinstance(x, str) for x in markers)
                and not any(x.partition('=')[0].lower() == 'cloud.docker.com'
                            or x.partition('=')[0].lower().startswith('cloud.docker.run.') for x in markers), 'cloud_engine_refused')
        offload()
        require(cloud_setting() == setting, 'docker_local_mode_changed')
        return info['ID']

    def mutation(self, state):
        require(state['daemon_id'] == self.local_engine() == self.daemon
                and state['socket'] == str(self.socket) and state['context'] == self.context, 'recorded_local_daemon_required')

    def fresh(self, state):
        require(state['daemon_id'] == self.daemon and state['socket'] == str(self.socket)
                and state['context'] == self.context, 'recorded_local_daemon_required')
        require(json.loads(self.call('info', '--format', '{{json .ID}}')) == self.daemon, 'docker_daemon_changed')


def labels(state):
    return {'org.selqiro.development': 'v1', 'org.selqiro.development.instance': state['instance'],
            'org.selqiro.development.lock': LOCK_SHA}


def container_command(state):
    return ['-B', '/opt/selqiro/development/supervisor.py', '--state', '/opt/selqiro/development-state',
            '--source', '/opt/selqiro/app', '--instance', state['instance'],
            '--app-port', str(state['app_port']), '--gateway-port', str(state['gateway_port'])]


def inspect_container(docker, state, *, missing=False):
    docker.fresh(state)
    raw = docker.call('container', 'inspect', state.get('container_id') or state['container_name'], allow_missing=missing)
    if raw is None:
        return None
    c = json.loads(raw)[0]
    require(re.fullmatch('[0-9a-f]{64}', c['Id']) and c['Name'] == '/' + state['container_name']
            and c['Image'] == IMAGE and (state.get('container_id') is None or state['container_id'] == c['Id']), 'owned_container_identity')
    require(all(c['Config'].get('Labels', {}).get(k) == v for k, v in labels(state).items()), 'owned_container_labels')
    expected_ports = {str(port) + '/tcp': [{'HostIp': '127.0.0.1', 'HostPort': str(port)}]
                      for port in (state['app_port'], state['gateway_port'])}
    host = c['HostConfig']
    require(host['PortBindings'] == expected_ports and not host.get('Binds') and not host.get('Privileged')
            and host['NetworkMode'] == 'bridge' and not host.get('CapAdd') and not host.get('PidMode'), 'owned_container_boundary')
    mounts = c['Mounts']
    require(len(mounts) == 1 and mounts[0]['Type'] == 'volume' and mounts[0]['Name'] == state['volume_name']
            and mounts[0]['Destination'] == '/opt/selqiro/development-state' and mounts[0]['RW'], 'owned_volume_mount')
    require(c['Config']['Entrypoint'] == ['/usr/bin/python3'] and c['Config']['Cmd'] == container_command(state), 'owned_entrypoint')
    volume = json.loads(docker.call('volume', 'inspect', state['volume_name']))[0]
    require(volume['Driver'] == 'local' and not volume.get('Options')
            and all(volume.get('Labels', {}).get(k) == v for k, v in labels(state).items())
            and volume['CreatedAt'] == state['volume_created_at'], 'owned_volume_identity')
    return c


def free_ports(state):
    sockets = []
    try:
        for port in (state['app_port'], state['gateway_port']):
            s = socket.socket()
            sockets.append(s)
            s.bind(('127.0.0.1', port))
    except OSError:
        raise RuntimeError('development_port_in_use') from None
    finally:
        for s in sockets:
            s.close()


def container_file(docker, state, path, *, missing=False):
    inspect_container(docker, state)
    raw = docker.call('cp', state['container_id'] + ':' + path, '-', allow_missing=missing)
    if raw is None:
        return None
    require(len(raw) <= 8 * 1024 * 1024, 'container_file_bound')
    with tarfile.open(fileobj=io.BytesIO(raw), mode='r:') as tar:
        rows = tar.getmembers()
        require(len(rows) == 1 and rows[0].isfile() and rows[0].size <= 4 * 1024 * 1024, 'container_file_kind')
        return tar.extractfile(rows[0]).read()


def runtime_status(docker, state):
    raw = container_file(docker, state, '/opt/selqiro/development-state/status.json', missing=True)
    if raw is None:
        return {'status': 'STARTING'}
    value = json.loads(raw)
    require(value['instance'] == state['instance'], 'runtime_status_owner')
    if value.get('generation') != state.get('generation'):
        return {'status': 'STARTING'}
    return value


def stop(docker, state):
    c = inspect_container(docker, state)
    if not c['State']['Running']:
        return
    # TERM only. No timeout-triggered SIGKILL, no removal, no unrelated process.
    docker.mutation(state)
    docker.call('container', 'kill', '--signal', 'SIGTERM', state['container_id'])
    deadline = time.monotonic() + 120
    while time.monotonic() < deadline:
        if not inspect_container(docker, state)['State']['Running']:
            return
        time.sleep(1)
    raise RuntimeError('graceful_stop_pending_data_preserved')


def create(docker, state):
    docker.fresh(state)
    volume = docker.call('volume', 'inspect', state['volume_name'], allow_missing=True)
    if volume is None:
        args = ['volume', 'create', '--driver', 'local']
        for k, v in labels(state).items():
            args.extend(['--label', k + '=' + v])
        docker.mutation(state)
        docker.call(*args, state['volume_name'])
        volume = docker.call('volume', 'inspect', state['volume_name'])
    volume = json.loads(volume)[0]
    require(volume['Driver'] == 'local' and not volume.get('Options')
            and all(volume.get('Labels', {}).get(k) == v for k, v in labels(state).items()), 'new_volume_owner')
    if state.get('volume_created_at'):
        require(state['volume_created_at'] == volume['CreatedAt'], 'volume_replaced')
    state['volume_created_at'] = volume['CreatedAt']
    private_json(STATE / 'host.json', state)
    existing = inspect_container(docker, state, missing=True)
    if existing is None:
        args = ['container', 'create', '--pull=never', '--platform', 'linux/arm64', '--name', state['container_name'],
            '--user', '0:0', '--init', '--network', 'bridge', '--restart', 'no',
            '--mount', 'type=volume,source=' + state['volume_name'] + ',target=/opt/selqiro/development-state,volume-nocopy',
            '--entrypoint', '/usr/bin/python3']
        for port in (state['app_port'], state['gateway_port']):
            args.extend(['--publish', '127.0.0.1:' + str(port) + ':' + str(port)])
        for k, v in labels(state).items():
            args.extend(['--label', k + '=' + v])
        docker.mutation(state)
        cid = docker.call(*args, IMAGE, *container_command(state)).decode().strip()
        require(re.fullmatch('[0-9a-f]{64}', cid), 'created_container_id')
        state['container_id'] = cid
    else:
        state['container_id'] = existing['Id']
    private_json(STATE / 'host.json', state)
    require(not inspect_container(docker, state)['State']['Running'], 'new_container_must_be_stopped')
    require(digest(container_file(docker, state, '/opt/selqiro/app/package-lock.json')) == LOCK_SHA
            and digest(container_file(docker, state, '/opt/selqiro/app/package.json')) == PACKAGE_SHA, 'image_dependency_lock_mismatch')


def copy_source(docker, state, bodies, runtime, runtime_sha):
    require(not inspect_container(docker, state)['State']['Running'], 'source_copy_requires_stopped_container')
    source_hashes = {k: digest(v) for k, v in sorted(bodies.items())}
    source_map = digest(json.dumps(source_hashes, sort_keys=True, separators=(',', ':')).encode())
    require(source_snapshot(Path(state['source'])) == bodies, 'source_changed_before_copy')
    state.update(generation=str(uuid.uuid4()), source_map_sha256=source_map, runtime_sha256=runtime_sha)
    private_json(STATE / 'host.json', state)
    payload = {'development/' + k: v for k, v in runtime.items()}
    payload.update({'development/source.tar': archive(bodies),
        'development/source.json': json_bytes({'files': source_hashes, 'sha256_map': source_map}),
        'development/launch.json': json_bytes({'instance': state['instance'], 'generation': state['generation'], 'source_map_sha256': source_map})})
    docker.mutation(state)
    docker.call('cp', '-', state['container_id'] + ':/opt/selqiro', data=archive(payload), timeout=60)


def accounts_file(docker, state, run_id):
    path = STATE / 'accounts.json'
    if not path.exists():
        value = json.loads(container_file(docker, state, '/opt/selqiro/development-state/backend/accounts.json'))
        require(value['format'] == 'selqiro-local-development-accounts-v1' and value['run_id'] == run_id
                and value['status'] == 'READY', 'local_accounts_not_ready')
        private_json(path, value)
    else:
        require(not path.is_symlink() and json.loads(path.read_text())['run_id'] == run_id, 'local_accounts_binding')
    value = json.loads(path.read_text())
    text_path = STATE / 'accounts.txt'
    require(not text_path.is_symlink(), 'accounts_text_symlink')
    lines = ['Selqiro kohalik arenduskeskkond', 'Need kontod kehtivad ainult selles kohalikus keskkonnas.', '']
    for account in value['accounts']:
        require(account['name'] in ('seller', 'buyer'), 'local_account_kind')
        lines.extend(['Müüja' if account['name'] == 'seller' else 'Ostja',
                      'E-post: ' + account['email'], 'Parool: ' + account['password'], ''])
    fd = os.open(text_path, os.O_WRONLY | os.O_CREAT | os.O_TRUNC | os.O_NOFOLLOW, 0o600)
    os.fchmod(fd, 0o600)
    with os.fdopen(fd, 'w') as output:
        output.write('\n'.join(lines))
    return str(text_path)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('action', choices=['check', 'start', 'restart', 'status', 'stop', 'logs'])
    parser.add_argument('--source', type=Path)
    parser.add_argument('--app-port', type=int, default=63110)
    parser.add_argument('--gateway-port', type=int, default=63111)
    args = parser.parse_args()
    require(1024 <= args.app_port <= 65535 and 1024 <= args.gateway_port <= 65535
            and args.app_port != args.gateway_port, 'ports')
    docker = Docker()
    state_path = STATE / 'host.json'
    require(not STATE.is_symlink() and not state_path.is_symlink(), 'host_state_symlink')
    old = json.loads(state_path.read_text()) if state_path.exists() else None
    if old:
        require(old['format'] == FORMAT and old['image'] == IMAGE, 'host_state_format')
        docker.fresh(old)
    source = args.source or (Path(old['source']) if old else None)
    if source and args.action in ('check', 'start', 'restart'):
        require(not source.is_symlink(), 'source_symlink')
        source = source.resolve(strict=True)
    if args.action == 'check':
        require(source is not None, 'source_required')
        bodies = source_snapshot(source)
        runtime_snapshot()
        ports = old or {'app_port': args.app_port, 'gateway_port': args.gateway_port}
        c = inspect_container(docker, old) if old and old.get('container_id') else None
        require(c is None or not c['State']['Running'], 'stop_development_before_source_update')
        free_ports(ports)
        print(json.dumps({'status': 'CHECK_OK', 'source_files': len(bodies), 'image': IMAGE, 'writes': False}))
        return
    if not old and args.action in ('status', 'stop', 'logs'):
        print(json.dumps({'status': 'NOT_CREATED', 'writes': False}))
        return
    STATE.mkdir(parents=True, exist_ok=True, mode=0o700)
    s = STATE.stat()
    require(s.st_uid == os.getuid() and stat.S_IMODE(s.st_mode) == 0o700, 'private_host_state_required')
    lock_fd = os.open(STATE / 'control.lock', os.O_WRONLY | os.O_CREAT | os.O_NOFOLLOW, 0o600)
    with os.fdopen(lock_fd, 'w') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        state = json.loads(state_path.read_text()) if state_path.exists() else None
        if state:
            require(state['format'] == FORMAT and state['image'] == IMAGE, 'host_state_format')
            docker.fresh(state)
            if source and args.action in ('start', 'restart'):
                require(str(source) == state['source'], 'recorded_source_directory_required')
        if args.action in ('status', 'logs', 'stop'):
            c = inspect_container(docker, state)
            if args.action == 'logs':
                output = docker.call('logs', '--tail', '80', state['container_id']).decode('utf-8', errors='replace')
                print(output, end='')
                return
            if args.action == 'stop':
                stop(docker, state)
                c = inspect_container(docker, state)
            value = runtime_status(docker, state)
            print(json.dumps({**value, 'container_running': c['State']['Running'],
                'container_exit_code': c['State']['ExitCode'], 'data_preserved': True}))
            return
        require(source is not None, 'source_required')
        runtime, runtime_sha = runtime_snapshot()
        if state and state.get('container_id'):
            c = inspect_container(docker, state)
            if c['State']['Running'] and args.action == 'start':
                value = runtime_status(docker, state)
                if value.get('status') == 'READY':
                    value['accounts_file'] = accounts_file(docker, state, value['run_id'])
                print(json.dumps(value))
                return
            require(state.get('runtime_sha256') in (None, runtime_sha), 'runtime_update_requires_reviewed_delivery')
            if c['State']['Running']:
                stop(docker, state)
        bodies = source_snapshot(source)
        if state is None:
            identifier = str(uuid.uuid4())
            state = {'format': FORMAT, 'instance': identifier, 'image': IMAGE,
                'source': str(source), 'daemon_id': docker.daemon, 'socket': str(docker.socket), 'context': docker.context,
                'container_name': 'selqiro-v2-development-' + identifier[:12], 'container_id': None,
                'volume_name': 'selqiro-v2-development-' + identifier[:12] + '-data',
                'app_port': args.app_port, 'gateway_port': args.gateway_port}
            private_json(state_path, state)
        free_ports(state)
        if not state.get('container_id'):
            create(docker, state)
        copy_source(docker, state, bodies, runtime, runtime_sha)
        inspect_container(docker, state)
        docker.mutation(state)
        docker.call('container', 'start', state['container_id'])
        deadline = time.monotonic() + 180
        while time.monotonic() < deadline:
            c = inspect_container(docker, state)
            value = runtime_status(docker, state)
            if value.get('status') == 'READY':
                require(value.get('source_map_sha256') == state['source_map_sha256'], 'started_source_binding')
                value['accounts_file'] = accounts_file(docker, state, value['run_id'])
                print(json.dumps(value))
                return
            if not c['State']['Running'] or value.get('status') in ('ERROR_PRESERVED', 'STOP_INCOMPLETE_PRESERVED', 'STOPPED_WITH_ERROR'):
                print(json.dumps({**value, 'container_running': c['State']['Running'], 'logs_command': 'dev.py logs'}))
                raise RuntimeError('development_start_failed_preserved')
            time.sleep(1)
        raise RuntimeError('development_start_still_pending_use_status_or_logs')


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        code = str(error)
        if not re.fullmatch('[a-zA-Z0-9_]+', code):
            code = type(error).__name__
        print(json.dumps({'status': 'ERROR_PRESERVED', 'error': code, 'reset_or_removal_performed': False}))
        raise SystemExit(1)
