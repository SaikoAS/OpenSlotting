import codecs
from contextlib import closing
import csv
import io
import json
from pathlib import Path
import tempfile
import unittest

import io_lab


def fixture_bytes(encoding):
    stream = io.StringIO(newline="")
    writer = csv.writer(stream, delimiter=";", lineterminator="\r\n", quotechar='"')
    writer.writerow(["Artikel", "Artikel", "Menge", "Notiz\nText", "Leer"])
    writer.writerows([
        ["00017", "00099", "90071992547409931234567890", 'erste Zeile\r\nzweite "Zeile"; Café €', ""],
        ["00000", "", "-999999999999999999999999999999", "Äpfel", ""],
        [],
        ["00017", "unterschiedlich", "1,000", "normal", ""]
    ])
    text = stream.getvalue()
    aliases = {"windows-1252": "cp1252", "utf-16-le": "utf-16-le", "utf-16-be": "utf-16-be", "utf-8": "utf-8"}
    output = text.encode(aliases[encoding])
    if encoding == "utf-16-le":
        output = codecs.BOM_UTF16_LE + output
    if encoding == "utf-16-be":
        output = codecs.BOM_UTF16_BE + output
    return output


class PositionalIoTests(unittest.TestCase):
    def test_lossless_original_and_positional_roundtrip_all_formats_encodings(self):
        with tempfile.TemporaryDirectory(prefix="openslotting-python-io-test-") as temp:
            root = Path(temp)
            for encoding in ["utf-8", "windows-1252", "utf-16-le", "utf-16-be"]:
                raw = fixture_bytes(encoding)
                source = root / (encoding + ".csv")
                source.write_bytes(raw)
                original = list(io_lab.positional_source(source, encoding))
                self.assertEqual(original[0]["headers"][:2], ["Artikel", "Artikel"])
                self.assertEqual(original[0]["headerSourceEndLine"], 2)
                self.assertEqual(original[1]["sourceLine"], 3)
                self.assertEqual(original[1]["sourceEndLine"], 4)
                self.assertEqual(original[3]["fields"], [])
                self.assertEqual(original[1]["fields"][0], "00017")
                self.assertEqual(original[1]["fields"][2], "90071992547409931234567890")
                for mode in io_lab.FORMATS:
                    if mode == "sqlite" and io_lab.sqlite3 is None:
                        continue
                    destination = root / (encoding + "-" + mode)
                    manifest = io_lab.build_bundle(source, destination, encoding, mode)
                    self.assertEqual((destination / "source.bin").read_bytes(), raw)
                    self.assertEqual(manifest["originalSha256"], io_lab.source_hash(source))
                    self.assertEqual(manifest["metadata"], original[0])
                    self.assertEqual(list(io_lab.iter_rows(destination)), original[1:])
                    expected = [r for r in original[1:] if r["fields"] and r["fields"][0] == "00017"]
                    self.assertEqual(list(io_lab.iter_rows(destination, "00017")), expected)
                    self.assertEqual(io_lab.manifest_for(destination, verify_original=True), manifest)

    def test_publication_rejects_existing_destination_and_failure_removes_owned_staging_only(self):
        with tempfile.TemporaryDirectory(prefix="openslotting-python-io-test-") as temp:
            root = Path(temp)
            source = root / "source.csv"
            source.write_bytes(b'A;B\r\n"unterminated;field')
            existing = root / "existing"
            existing.mkdir()
            protected = existing / "protected.txt"
            protected.write_text("keep", encoding="utf-8")
            with self.assertRaises(FileExistsError):
                io_lab.build_bundle(source, existing)
            with self.assertRaises(csv.Error):
                io_lab.build_bundle(source, root / "failed")
            self.assertFalse((root / "failed").exists())
            self.assertEqual(list(root.glob(".building-*")), [])
            self.assertEqual(protected.read_text(encoding="utf-8"), "keep")
            self.assertEqual(source.read_bytes(), b'A;B\r\n"unterminated;field')

    def test_strict_encoding_and_original_integrity(self):
        with tempfile.TemporaryDirectory(prefix="openslotting-python-io-test-") as temp:
            root = Path(temp)
            source = root / "source.csv"
            source.write_bytes(fixture_bytes("windows-1252"))
            with self.assertRaises(UnicodeDecodeError):
                io_lab.build_bundle(source, root / "bad", "utf-8")
            output = root / "good"
            io_lab.build_bundle(source, output, "windows-1252")
            (output / "source.bin").write_bytes(b"tampered")
            with self.assertRaises(ValueError):
                io_lab.manifest_for(output, verify_original=True)
            source.write_bytes(fixture_bytes("utf-16-be"))
            with self.assertRaises(ValueError):
                list(io_lab.positional_source(source, "utf-16-le"))

    def test_sqlite_fields_are_text_and_position_filter_is_not_semantic_mapping(self):
        if io_lab.sqlite3 is None:
            self.skipTest("Optional sqlite3 absent from this Python distribution")
        with tempfile.TemporaryDirectory(prefix="openslotting-python-io-test-") as temp:
            root = Path(temp)
            source = root / "source.csv"
            source.write_bytes(fixture_bytes("utf-8"))
            output = root / "sqlite"
            io_lab.build_bundle(source, output, mode="sqlite")
            with closing(io_lab.sqlite3.connect(output / "data.sqlite")) as connection:
                row = connection.execute("SELECT typeof(fields_json),typeof(filter_position0),fields_json FROM rows WHERE row_index=0").fetchone()
            self.assertEqual(row[:2], ("text", "text"))
            self.assertEqual(json.loads(row[2])[2], "90071992547409931234567890")
            self.assertEqual(len(list(io_lab.iter_rows(output, "00099"))), 0)


if __name__ == "__main__":
    unittest.main()
