"""Isolated positional CSV projections. Python standard library only.

Original source bytes are the lossless authority. Projections retain ordered
string fields and physical source line spans; they are not OpenSlotting workspaces.
"""
from __future__ import annotations

import codecs
import csv
import gzip
import hashlib
import io
import json
import os
from pathlib import Path
import shutil
import uuid

try:
    import sqlite3
except ImportError:
    sqlite3 = None

FORMATS = ("json", "ndjson", "ndjson-gzip", "sqlite")
PROJECTION_SCHEMA = "openslotting-lab-positional-csv/1"
csv.field_size_limit(16 * 1024 * 1024)


def _json(value):
    return json.dumps(value, ensure_ascii=False, separators=(",", ":"))


def source_hash(path):
    digest = hashlib.sha256()
    with Path(path).open("rb") as handle:
        for chunk in iter(lambda: handle.read(512 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _decoder(path, declared):
    # Explicit encoding: no guessed replacements or lossy errors='ignore'.
    declared = declared.lower().replace("_", "-")
    aliases = {"windows-1252": "cp1252", "utf-16-le": "utf-16-le", "utf-16-be": "utf-16-be", "utf-8": "utf-8"}
    if declared not in aliases:
        raise ValueError("Supported declared encodings: utf-8, windows-1252, utf-16-le, utf-16-be")
    with Path(path).open("rb") as handle:
        prefix = handle.read(4)
    if declared == "utf-8" and prefix.startswith(codecs.BOM_UTF8):
        return "utf-8-sig"
    if declared in ("utf-16-le", "utf-16-be") and prefix[:2] in (codecs.BOM_UTF16_LE, codecs.BOM_UTF16_BE):
        expected = codecs.BOM_UTF16_LE if declared == "utf-16-le" else codecs.BOM_UTF16_BE
        if prefix[:2] != expected:
            raise ValueError("UTF-16 BOM contradicts declared byte order")
        return "utf-16"
    return aliases[declared]


def positional_source(path, declared_encoding, delimiter=";"):
    """Iterator yields metadata, then rows; csv.reader values remain strings."""
    if not isinstance(delimiter, str) or len(delimiter) != 1:
        raise ValueError("One-character delimiter required")
    path = Path(path)
    with path.open("r", encoding=_decoder(path, declared_encoding), newline="") as handle:
        reader = csv.reader(handle, delimiter=delimiter, quotechar='"', doublequote=True, strict=True)
        try:
            headers = next(reader)
        except StopIteration:
            headers = []
        header_end = reader.line_num
        yield {"projectionSchema": PROJECTION_SCHEMA, "encoding": declared_encoding, "delimiter": delimiter,
               "headers": headers, "headerSourceEndLine": header_end}
        previous_line = header_end
        for row_index, fields in enumerate(reader):
            source_line = previous_line + 1
            previous_line = reader.line_num
            yield {"rowIndex": row_index, "sourceLine": source_line, "sourceEndLine": reader.line_num, "fields": fields}


def _write_projection(path, source_path, encoding, mode, delimiter):
    iterator = positional_source(source_path, encoding, delimiter)
    metadata = next(iterator)
    if mode == "json":
        # Deliberately materialized reference for a whole-document JSON export.
        with path.open("w", encoding="utf-8", newline="\n") as handle:
            json.dump({"metadata": metadata, "rows": list(iterator)}, handle, ensure_ascii=False, separators=(",", ":"))
    elif mode in ("ndjson", "ndjson-gzip"):
        if mode == "ndjson-gzip":
            binary = path.open("wb")
            compressed = gzip.GzipFile(filename="", mode="wb", fileobj=binary, mtime=0)
            handle = io.TextIOWrapper(compressed, encoding="utf-8", newline="\n")
        else:
            binary = None
            handle = path.open("w", encoding="utf-8", newline="\n")
        try:
            handle.write(_json({"metadata": metadata}) + "\n")
            for row in iterator:
                handle.write(_json(row) + "\n")
        finally:
            handle.close()
            if binary is not None:
                binary.close()
    elif mode == "sqlite":
        if sqlite3 is None:
            raise RuntimeError("This Python distribution has no optional sqlite3 standard-library module")
        connection = sqlite3.connect(path)
        try:
            with connection:
                connection.execute("CREATE TABLE metadata (key TEXT PRIMARY KEY, value TEXT NOT NULL)")
                connection.execute("INSERT INTO metadata VALUES ('source', ?)", (_json(metadata),))
                connection.execute("CREATE TABLE rows (row_index INTEGER PRIMARY KEY, source_line INTEGER NOT NULL, "
                                   "source_end_line INTEGER NOT NULL, fields_json TEXT NOT NULL, filter_position0 TEXT)")
                # The optional index is explicitly a synthetic source-position-0
                # projection, not a semantic/ERP field mapping. Text stays text.
                connection.executemany("INSERT INTO rows VALUES (?, ?, ?, ?, ?)",
                    ((row["rowIndex"], row["sourceLine"], row["sourceEndLine"], _json(row["fields"]),
                      row["fields"][0] if row["fields"] else None) for row in iterator))
                connection.execute("CREATE INDEX rows_position0 ON rows(filter_position0)")
        finally:
            connection.close()
    else:
        raise ValueError("Unknown projection format")
    return metadata


def build_bundle(source, destination, encoding="utf-8", mode="ndjson", delimiter=";"):
    """Publish a complete source+projection bundle by same-parent directory rename.

    Destination must not exist. Staging is removed on failure. This is a single
    artifact visibility boundary, not a full application/storage transaction.
    """
    if mode not in FORMATS:
        raise ValueError("Unknown projection format")
    source, destination = Path(source).resolve(), Path(destination).resolve()
    if destination.exists():
        raise FileExistsError(destination)
    destination.parent.mkdir(parents=True, exist_ok=True)
    staging = destination.parent / (".building-" + uuid.uuid4().hex)
    if staging.parent.resolve() != destination.parent.resolve():
        raise ValueError("Invalid staging path")
    staging.mkdir()
    names = {"json": "data.json", "ndjson": "data.ndjson", "ndjson-gzip": "data.ndjson.gz", "sqlite": "data.sqlite"}
    try:
        original = staging / "source.bin"
        shutil.copyfile(source, original)
        sha = source_hash(original)
        metadata = _write_projection(staging / names[mode], original, encoding, mode, delimiter)
        manifest = {"projectionSchema": PROJECTION_SCHEMA, "format": mode, "sourceName": source.name,
                    "originalFile": "source.bin", "originalBytes": original.stat().st_size, "originalSha256": sha,
                    "projectionFile": names[mode], "projectionSha256": source_hash(staging / names[mode]), "metadata": metadata,
                    "sqliteFilterProjection": "raw string source position 0; no semantic field mapping" if mode == "sqlite" else None}
        (staging / "manifest.json").write_text(_json(manifest) + "\n", encoding="utf-8")
        os.rename(staging, destination)
        return manifest
    except BaseException:
        # This is the exact owned staging path validated above, never source/destination.
        if staging.exists() and staging.parent.resolve() == destination.parent.resolve():
            shutil.rmtree(staging)
        raise


def manifest_for(bundle, verify_original=False):
    bundle = Path(bundle)
    manifest = json.loads((bundle / "manifest.json").read_text(encoding="utf-8"))
    if manifest["projectionSchema"] != PROJECTION_SCHEMA:
        raise ValueError("Unsupported lab schema")
    names = {"json": "data.json", "ndjson": "data.ndjson", "ndjson-gzip": "data.ndjson.gz", "sqlite": "data.sqlite"}
    if manifest.get("format") not in names or manifest.get("originalFile") != "source.bin" or manifest.get("projectionFile") != names[manifest["format"]]:
        raise ValueError("Invalid artifact paths or format")
    if verify_original:
        original = bundle / manifest["originalFile"]
        if original.stat().st_size != manifest["originalBytes"] or source_hash(original) != manifest["originalSha256"]:
            raise ValueError("Original bytes do not match SHA-256")
        if source_hash(bundle / manifest["projectionFile"]) != manifest["projectionSha256"]:
            raise ValueError("Projection does not match SHA-256")
    return manifest


def iter_rows(bundle, filtered_position0=None):
    bundle = Path(bundle)
    manifest = manifest_for(bundle)
    path, mode = bundle / manifest["projectionFile"], manifest["format"]
    if mode == "json":
        with path.open("r", encoding="utf-8") as handle:
            rows = json.load(handle)["rows"]
        for row in rows:
            if filtered_position0 is None or row["fields"] and row["fields"][0] == filtered_position0:
                yield row
    elif mode in ("ndjson", "ndjson-gzip"):
        opener = gzip.open if mode == "ndjson-gzip" else open
        with opener(path, "rt", encoding="utf-8", newline="") as handle:
            next(handle)  # metadata remains in the separate verified manifest too.
            for line in handle:
                row = json.loads(line)
                if filtered_position0 is None or row["fields"] and row["fields"][0] == filtered_position0:
                    yield row
    elif mode == "sqlite":
        if sqlite3 is None:
            raise RuntimeError("sqlite3 unavailable")
        connection = sqlite3.connect(f"{path.as_uri()}?mode=ro", uri=True)
        try:
            query = "SELECT row_index,source_line,source_end_line,fields_json FROM rows"
            params = ()
            if filtered_position0 is not None:
                query += " WHERE filter_position0 = ?"
                params = (filtered_position0,)
            query += " ORDER BY row_index"
            for row_index, source_line, source_end_line, fields in connection.execute(query, params):
                yield {"rowIndex": row_index, "sourceLine": source_line, "sourceEndLine": source_end_line, "fields": json.loads(fields)}
        finally:
            connection.close()
    else:
        raise ValueError("Unknown lab format")


def bundle_size(bundle):
    return sum(path.stat().st_size for path in Path(bundle).iterdir() if path.is_file())
