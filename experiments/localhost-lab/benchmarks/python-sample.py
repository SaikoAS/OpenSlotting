"""Measure gzip envelope in an isolated Python process with synthetic JSON on stdin."""
import hashlib
import importlib.util
import json
import platform
import statistics
import sys
import time
from pathlib import Path

spec = importlib.util.spec_from_file_location('lab_backup_codec', Path(__file__).resolve().parents[1] / 'modules/backup_codec.py')
codec = importlib.util.module_from_spec(spec)
spec.loader.exec_module(codec)
level, repeats = map(int, sys.argv[1:3])
if repeats < 3:
    raise ValueError('At least three repeats required')
data = sys.stdin.buffer.read()
expected = hashlib.sha256(data).digest()
encode_times, decode_times = [], []
for iteration in range(repeats + 1):
    start = time.perf_counter()
    packed = codec.encode(data, level)
    middle = time.perf_counter()
    restored = codec.decode(packed, len(data))
    end = time.perf_counter()
    assert hashlib.sha256(restored).digest() == expected
    if iteration:
        encode_times.append((middle - start) * 1000)
        decode_times.append((end - middle) * 1000)
print(json.dumps(dict(engine='Python stdlib gzip', python=platform.python_version(), level=level, repeats=repeats,
                      inputBytes=len(data), encodedBytes=len(packed), ratio=len(packed) / len(data),
                      encode=dict(samplesMs=encode_times, medianMs=statistics.median(encode_times)),
                      decode=dict(samplesMs=decode_times, medianMs=statistics.median(decode_times)),
                      warmup=1, integrity='SHA-256 passed', memory='not measured',
                      scope='codec only; process startup, stdin and JSON validation outside timings')))
