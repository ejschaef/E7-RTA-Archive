import json
from flask import url_for, current_app
import os

def load_manifest():
    MANIFEST_PATH = current_app.static_folder + '/dist/manifest.json'
    with open(MANIFEST_PATH) as f:
        manifest = json.load(f)
        return manifest

_manifest = None

_cache = {}

def get_manifest(filename):
    if filename in _cache:
        return _cache[filename]
    global _manifest
    if _manifest is None:
        _manifest = load_manifest()
    relative_path = _manifest.get(filename, filename)
    url = url_for('static', filename=relative_path)
    _cache[filename] = url
    return url