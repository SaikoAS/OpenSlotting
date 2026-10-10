"""Run only when other browser/CPU benchmarks are idle. No server, no data API."""
import codecs
import csv
import gc
import hashlib
import io
import json
import os
from pathlib import Path
import platform
import statistics
import subprocess
import tempfile
import time
import tracemalloc

import io_lab

HERE = Path(__file__).resolve().parent
REPEATS = 5


def synthetic_source(rows):
    text = io.StringIO(newline="")
    writer = csv.writer(text, delimiter=";", lineterminator="\r\n")
    writer.writerow(["Artikel", "Artikel", "Menge", "Notiz", "Datum", "Leer"])
    for i in range(rows):
        writer.writerow([f"{i % 100:010d}", f"{i % 31:010d}",
                         ("-" if i % 7 == 0 else "") + str(90071992547409931234567890 + i),
                         'Zeile 1\r\nZeile "2"; Café €' if i % 29 == 0 else "Äpfel; Reihe " + str(i),
                         "04.10.2026", ""])
    return text.getvalue().encode("utf-8")


def timed(fn):
    samples = []
    for _ in range(REPEATS):
        gc.collect()
        start = time.perf_counter()
        fn()
        samples.append((time.perf_counter() - start) * 1000)
    return {"medianMs": statistics.median(samples), "minMs": min(samples), "maxMs": max(samples), "samplesMs": samples}


def python_peak(fn):
    # Separate untimed operation. tracemalloc sees Python allocations only;
    # SQLite's C cache, compressor buffers, RSS and OS file cache are not covered.
    gc.collect()
    tracemalloc.start()
    try:
        result = fn()
        _, peak = tracemalloc.get_traced_memory()
        return peak
    finally:
        tracemalloc.stop()


def consume(rows):
    count = 0
    characters = 0
    for row in rows:
        count += 1
        characters += sum(map(len, row["fields"]))
    return count, characters


def digest_rows(rows):
    digest = hashlib.sha256()
    for row in rows:
        digest.update(json.dumps(row, ensure_ascii=False, separators=(",", ":")).encode("utf-8"))
        digest.update(b"\n")
    return digest.hexdigest()


def main():
    report = {
        "generatedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "baselineCommit": subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=HERE.parents[2], text=True).strip(),
        "environment": {"python": platform.python_version(), "platform": platform.platform(),
                        "machine": platform.machine(), "logicalCpus": os.cpu_count(),
                        "sqliteVersion": io_lab.sqlite3.sqlite_version if io_lab.sqlite3 is not None else None},
        "methodology": {"repeats": REPEATS, "sizes": [1000, 10000], "fixtures": "deterministic synthetic UTF-8 CSV",
                        "build": "source copy + source SHA + strict CSV parse + projection + index + projection SHA + final directory rename",
                        "read": "consume all positional rows, no business analysis, no original-source rehash",
                        "filtered": "exact raw source-position-0 string match 0000000017; indexed only in SQLite",
                        "memory": "separate tracemalloc peakPythonBytes; NOT process RSS or SQLite/gzip native memory",
                        "diskCache": "warm OS cache likely; no control, no production-throughput claim",
                        "integrations": "none; no server/API/Workspace parser/schema or ERP mapping"},
        "results": [], "csvReference": [], "unavailable": []
    }
    with tempfile.TemporaryDirectory(prefix="openslotting-python-io-benchmark-") as temporary:
        root = Path(temporary)
        for size in [1000, 10000]:
            source = root / f"source-{size}.csv"
            source.write_bytes(synthetic_source(size))
            source_iterator = io_lab.positional_source(source, "utf-8")
            expected_metadata = next(source_iterator)
            expected_digest = digest_rows(source_iterator)
            expected_filtered = consume(row for row in list(io_lab.positional_source(source, "utf-8"))[1:]
                                        if row["fields"] and row["fields"][0] == "0000000017")
            def source_rows():
                iterator = io_lab.positional_source(source, "utf-8")
                next(iterator)
                yield from iterator
            csv_read = lambda: consume(source_rows())
            csv_filtered = lambda: consume(row for row in source_rows() if row["fields"] and row["fields"][0] == "0000000017")
            csv_read(); csv_filtered()
            report["csvReference"].append({"rows": size, "sourceBytes": source.stat().st_size,
                "read": timed(csv_read), "filtered": timed(csv_filtered),
                "peakPythonBytes": {"read": python_peak(csv_read), "filtered": python_peak(csv_filtered)}})
            for mode in io_lab.FORMATS:
                if mode == "sqlite" and io_lab.sqlite3 is None:
                    report["unavailable"].append({"format": mode, "reason": "Optional sqlite3 absent from existing Python"})
                    continue
                counter = 0
                def build():
                    nonlocal counter
                    counter += 1
                    path = root / f"bundle-{size}-{mode}-{counter}"
                    io_lab.build_bundle(source, path, "utf-8", mode)
                    return path
                build()  # Single unmeasured warmup.
                build_timing = timed(build)
                memory_build_path = None
                def memory_build():
                    nonlocal memory_build_path
                    memory_build_path = build()
                build_memory = python_peak(memory_build)
                bundle = memory_build_path
                manifest = io_lab.manifest_for(bundle, verify_original=True)
                assert manifest["metadata"] == expected_metadata
                assert digest_rows(io_lab.iter_rows(bundle)) == expected_digest
                assert consume(io_lab.iter_rows(bundle))[0] == size
                assert consume(io_lab.iter_rows(bundle, "0000000017")) == expected_filtered
                read_fn = lambda: consume(io_lab.iter_rows(bundle))
                filter_fn = lambda: consume(io_lab.iter_rows(bundle, "0000000017"))
                read_fn(); filter_fn()  # Unmeasured read/query warmup.
                report["results"].append({
                    "rows": size, "format": mode, "sourceBytes": source.stat().st_size,
                    "originalSha256": manifest["originalSha256"], "rowsSha256": expected_digest,
                    "projectionBytes": (bundle / manifest["projectionFile"]).stat().st_size,
                    "bundleBytes": io_lab.bundle_size(bundle), "filterMatches": expected_filtered[0],
                    "build": build_timing, "read": timed(read_fn), "filtered": timed(filter_fn),
                    "peakPythonBytes": {"build": build_memory, "read": python_peak(read_fn), "filtered": python_peak(filter_fn)}
                })
                print(size, mode, "done", flush=True)
    report["sources"] = {name: hashlib.sha256((HERE / name).read_bytes()).hexdigest()
                         for name in ["io_lab.py", "test_io_lab.py", "run_benchmarks.py"]}
    output = HERE / "results" / "python-io.json"
    output.parent.mkdir(exist_ok=True)
    output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("Saved", output, flush=True)


if __name__ == "__main__":
    main()
