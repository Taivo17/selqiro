"""One fresh isolated PostgreSQL fixture. No linked project or hosted credentials."""
from pathlib import Path
import hashlib
import json
import os
import socket
import subprocess
import sys

HERE = Path(__file__).resolve().parent
if len(sys.argv) not in (3, 4) or (len(sys.argv) == 4 and sys.argv[3] != 'capture'):
    raise SystemExit('usage: run_native.py NEW_OUTPUT_DIRECTORY TEST_RUNTIME_DIRECTORY [capture]')
OUT = Path(sys.argv[1]).resolve()
TEST_RUNTIME = Path(sys.argv[2]).resolve()
BIN = TEST_RUNTIME / 'node_modules/@embedded-postgres/linux-x64/native/bin'
mode = sys.argv[3] if len(sys.argv) == 4 else 'verify'
if OUT.exists():
    raise SystemExit('fresh_fixture_directory_required')
OUT.mkdir(parents=True, mode=0o700)
commands = []
with socket.socket() as sock:
    sock.bind(('127.0.0.1', 0))
    port = sock.getsockname()[1]

def run(args, step, timeout=60):
    result = subprocess.run([str(x) for x in args], cwd=HERE, stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT, timeout=timeout, env={'PATH': os.environ['PATH'], 'LC_ALL': 'C.UTF-8'})
    (OUT / (step + '.log')).write_bytes(result.stdout)
    commands.append({'step': step, 'exit_code': result.returncode,
        'output_sha256': hashlib.sha256(result.stdout).hexdigest()})
    (OUT / 'commands.json').write_text(json.dumps(commands, indent=2) + '\n')
    print(step + ': ' + str(result.returncode), flush=True)
    if result.returncode:
        print(result.stdout.decode('utf-8', 'replace')[-5000:], flush=True)
        raise RuntimeError('fixture_failed:' + step)

started, failure = False, None
try:
    run([BIN/'initdb', '-D', OUT/'data', '-U', 'postgres', '--encoding=UTF8', '--locale=C', '--auth-local=trust', '--auth-host=trust'], 'initdb')
    with (OUT / 'data/postgresql.conf').open('a') as f:
        f.write("\nunix_socket_directories=''\n")
    run([BIN/'pg_ctl', '-D', OUT/'data', '-l', OUT/'postgres.log', '-o', '-h 127.0.0.1 -p ' + str(port), '-w', 'start'], 'start')
    started = True
    run(['node', HERE/'runtime.mjs', OUT, str(port), TEST_RUNTIME, mode], 'native')
except Exception as error:
    failure = str(error)
finally:
    if started:
        try:
            run([BIN/'pg_ctl', '-D', OUT/'data', '-m', 'fast', '-w', 'stop'], 'stop')
        except Exception as error:
            failure = failure or str(error)
    stopped = not (OUT/'data/postmaster.pid').exists()
    (OUT/'stopped.json').write_text(json.dumps({'stopped': stopped, 'live_database_accessed': False, 'failure': failure}, indent=2) + '\n')
    if failure or not stopped:
        raise SystemExit(failure or 'fixture_did_not_stop')
