import json
from flask import url_for, current_app

def load_manifest() -> dict[str, str]:
    """Returns the manifest dictionary as loaded from the file specified in MANIFEST_PATH.
    This dictionary maps filenames to URLs for webpack resources that can be accessed from
    the web app."""
    MANIFEST_PATH = current_app.static_folder + '/dist/manifest.json'
    with open(MANIFEST_PATH) as f:
        manifest = json.load(f)
        return manifest

_manifest = None

_cache = {}

def get_manifest(filename: str) -> str:
    """
    Given a filename, return the URL that can be used to access the webpacked resource.
    The filename is first looked up in the manifest. If it's not found, the filename
    is assumed to be relative to the static folder. The URL is cached to improve
    performance.
    """
    if filename in _cache:
        return _cache[filename]
    global _manifest
    if _manifest is None:
        _manifest = load_manifest()
    relative_path = _manifest.get(filename, filename)
    url = url_for('static', filename=relative_path)
    _cache[filename] = url
    return url
