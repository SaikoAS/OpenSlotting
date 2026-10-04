"""Optional local Python gzip envelope; no server route or automatic file access."""
import gzip
import io


def encode(data, level=6):
    if level not in {1, 6, 9}:
        raise ValueError('Allowed experimental levels: 1, 6, 9')
    return gzip.compress(data, compresslevel=level, mtime=0)


def decode(data, max_bytes=256 * 1024 * 1024):
    if not isinstance(max_bytes, int) or max_bytes < 0:
        raise ValueError('Invalid decode limit')
    with gzip.GzipFile(fileobj=io.BytesIO(data), mode='rb') as stream:
        output = bytearray()
        while True:
            chunk = stream.read(min(65536, max_bytes - len(output) + 1))
            if not chunk:
                return bytes(output)
            output.extend(chunk)
            if len(output) > max_bytes:
                raise ValueError('Backup exceeds decode limit')
